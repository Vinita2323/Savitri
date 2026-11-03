import mongoose from 'mongoose';
import TreasuryAccount from '../models/TreasuryAccount.model.js';
import JournalEntry, { SYSTEM_ACCOUNTS } from '../models/JournalEntry.model.js';
import GatewayPayment from '../models/GatewayPayment.model.js';
import GatewaySettlement from '../models/GatewaySettlement.model.js';
import BankStatementEntry from '../models/BankStatementEntry.model.js';
import Counter from '../models/Counter.model.js';
import { nextSequence } from '../models/Counter.model.js';

/**
 * Double-entry treasury ledger.
 *  - amounts are integer paise; every entry must balance (debits == credits)
 *  - entries are idempotent: the same idempotencyKey never posts twice
 *  - posted entries are immutable; corrections are reversal entries
 *  - balances are derived from the journal (never stored), so they cannot drift
 */

// The app disables mongoose autoIndex. The unique indexes below are what make idempotency and
// duplicate prevention safe, so guarantee they exist before the first financial write.
let indexesReady = null;
export const ensureTreasuryIndexes = () => {
  if (!indexesReady) {
    indexesReady = Promise.all(
      [TreasuryAccount, JournalEntry, GatewayPayment, GatewaySettlement, BankStatementEntry].map((m) => m.createIndexes())
    ).catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
};

const noTransactionSupport = (e) =>
  /Transaction numbers are only allowed on a replica set|replica set member or mongos|Transactions are not supported/i.test(String(e?.message || ''));

let warnedStandalone = false;
/**
 * Runs fn inside a MongoDB transaction. On a standalone MongoDB (local development) transactions do
 * not exist, so it runs without one - every ledger write is still a single atomic document and is
 * idempotent. Production (Atlas / replica set) always uses a real transaction.
 */
export const withTxn = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (e) {
    if (noTransactionSupport(e)) {
      if (!warnedStandalone) {
        warnedStandalone = true;
        console.warn('[Treasury] MongoDB has no transaction support (standalone). Running without multi-document transactions.');
      }
      return fn(null);
    }
    throw e;
  } finally {
    await session.endSession();
  }
};

const opts = (session) => (session ? { session } : {});

export const actorOf = (req) => ({
  id: String(req?.user?.id || ''),
  email: req?.user?.email || '',
  role: req?.user?.role || '',
});
export const SYSTEM_ACTOR = { id: 'system', email: 'system@treasury', role: 'system' };

const isDup = (e) => e && (e.code === 11000 || /E11000/.test(String(e.message)));

// ── System accounts (Razorpay Clearing / Gateway Fees per brand) ──────────────────────────────
const SYSTEM_DEFS = {
  GATEWAY_CLEARING: 'Razorpay Clearing',
  GATEWAY_FEE: 'Razorpay Gateway Fees',
};

export const ensureSystemAccount = async (type, brandId, session) => {
  const key = `${type}:${brandId}`;
  const find = () => TreasuryAccount.findOne({ systemKey: key }, null, opts(session));
  let acc = await find();
  if (acc) return acc;
  try {
    const created = await TreasuryAccount.create(
      [{ brandId, name: SYSTEM_DEFS[type], type, isSystem: true, systemKey: key, isActive: true, createdBy: SYSTEM_ACTOR }],
      opts(session)
    );
    return created[0];
  } catch (e) {
    if (!isDup(e)) throw e;
    acc = await find();
    if (!acc) throw e;
    return acc;
  }
};

// ── Posting ────────────────────────────────────────────────────────────────────────────────────
/**
 * lines: [{ accountId } | { systemCode }, debitPaise?, creditPaise?, memo? ]
 * Returns { entry, duplicate }.
 */
export const postEntry = async (input, { session = null, allowInactive = false } = {}) => {
  const { description, sourceModule, sourceRef = '', idempotencyKey, lines, actor, entryDate, meta = {}, reversalOf = null } = input;
  if (!idempotencyKey) throw new Error('A journal entry needs an idempotency key.');
  if (!actor || !actor.email) throw new Error('A journal entry needs an authenticated actor.');
  if (!Array.isArray(lines) || lines.length < 2) throw new Error('A journal entry needs at least two lines.');

  const existing = await JournalEntry.findOne({ idempotencyKey }, null, opts(session));
  if (existing) return { entry: existing, duplicate: true };

  let totalDebit = 0;
  let totalCredit = 0;
  const accountIds = lines.filter((l) => l.accountId).map((l) => String(l.accountId));
  const accounts = accountIds.length
    ? await TreasuryAccount.find({ _id: { $in: accountIds } }, null, opts(session))
    : [];
  const byId = new Map(accounts.map((a) => [String(a._id), a]));

  const prepared = lines.map((l, i) => {
    const debit = l.debitPaise || 0;
    const credit = l.creditPaise || 0;
    if (!Number.isInteger(debit) || !Number.isInteger(credit) || debit < 0 || credit < 0) {
      throw new Error(`Line ${i + 1}: amounts must be whole paise.`);
    }
    if ((debit > 0) === (credit > 0)) throw new Error(`Line ${i + 1}: exactly one of debit or credit must be positive.`);
    totalDebit += debit;
    totalCredit += credit;
    if (l.accountId) {
      const acc = byId.get(String(l.accountId));
      if (!acc) throw new Error(`Line ${i + 1}: treasury account not found.`);
      if (!acc.isActive && !allowInactive) throw new Error(`Line ${i + 1}: account "${acc.name}" is inactive.`);
      return { accountKind: 'TREASURY', accountId: acc._id, brandId: acc.brandId, debitPaise: debit, creditPaise: credit, memo: l.memo || '' };
    }
    if (!SYSTEM_ACCOUNTS.includes(l.systemCode)) throw new Error(`Line ${i + 1}: unknown system account.`);
    return { accountKind: 'SYSTEM', systemCode: l.systemCode, brandId: l.brandId || '', debitPaise: debit, creditPaise: credit, memo: l.memo || '' };
  });
  if (totalDebit !== totalCredit) throw new Error(`Unbalanced entry: debits ${totalDebit} != credits ${totalCredit} (paise).`);
  if (totalDebit <= 0) throw new Error('A journal entry must move a positive amount.');

  const brands = [...new Set(prepared.map((l) => l.brandId).filter(Boolean))];
  const brandId = brands.length === 1 ? brands[0] : brands.length > 1 ? 'MULTI' : '';

  const year = new Date().getFullYear();
  const seq = await nextSequence(`journal-${year}`);
  const doc = {
    entryNumber: `JE-${year}-${String(seq).padStart(6, '0')}`,
    brandId,
    entryDate: entryDate ? new Date(entryDate) : new Date(),
    description: String(description || '').slice(0, 500) || sourceModule,
    sourceModule,
    sourceRef: String(sourceRef || ''),
    idempotencyKey,
    lines: prepared,
    totalPaise: totalDebit,
    createdBy: { id: actor.id, email: actor.email, role: actor.role },
    meta,
    reversalOf,
  };
  try {
    const created = await JournalEntry.create([doc], opts(session));
    return { entry: created[0], duplicate: false };
  } catch (e) {
    if (isDup(e)) {
      const again = await JournalEntry.findOne({ idempotencyKey });
      if (again) return { entry: again, duplicate: true };
    }
    throw e;
  }
};

/** Corrects a posted entry by posting its mirror image. The original is flagged REVERSED, never altered. */
export const reverseEntry = async (entryId, { actor, reason }) => {
  if (!reason || !String(reason).trim()) throw new Error('A reason is required to reverse an entry.');
  return withTxn(async (session) => {
    const original = await JournalEntry.findById(entryId, null, opts(session));
    if (!original) throw Object.assign(new Error('Entry not found.'), { status: 404 });
    if (original.status === 'REVERSED') throw Object.assign(new Error('This entry was already reversed.'), { status: 409 });
    if (original.sourceModule === 'REVERSAL') throw Object.assign(new Error('A reversal entry cannot be reversed. Post a new entry instead.'), { status: 409 });
    const lines = original.lines.map((l) => ({
      accountId: l.accountKind === 'TREASURY' ? l.accountId : undefined,
      systemCode: l.accountKind === 'SYSTEM' ? l.systemCode : undefined,
      brandId: l.brandId,
      debitPaise: l.creditPaise,
      creditPaise: l.debitPaise,
      memo: `Reversal of ${original.entryNumber}`,
    }));
    const { entry: reversal } = await postEntry(
      {
        description: `Reversal of ${original.entryNumber}: ${String(reason).trim()}`,
        sourceModule: 'REVERSAL',
        sourceRef: original.entryNumber,
        idempotencyKey: `reversal:${original._id}`,
        lines,
        actor,
        reversalOf: original._id,
        meta: { reason: String(reason).trim() },
      },
      { session, allowInactive: true }
    );
    const flagged = await JournalEntry.markReversed(original._id, reversal._id, String(reason).trim(), session);
    if (!flagged) throw Object.assign(new Error('This entry was already reversed.'), { status: 409 });
    return { original: original._id, reversal };
  });
};

// ── Balances ───────────────────────────────────────────────────────────────────────────────────
/** Map accountId -> { debitPaise, creditPaise, balancePaise } computed from the journal (assets / expenses are debit-normal). */
export const accountBalances = async (accountIds) => {
  const match = { 'lines.accountKind': 'TREASURY' };
  if (accountIds) match['lines.accountId'] = { $in: accountIds.map((id) => new mongoose.Types.ObjectId(String(id))) };
  const rows = await JournalEntry.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.accountKind': 'TREASURY', ...(accountIds ? { 'lines.accountId': { $in: accountIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } : {}) } },
    { $group: { _id: '$lines.accountId', debitPaise: { $sum: '$lines.debitPaise' }, creditPaise: { $sum: '$lines.creditPaise' } } },
  ]);
  const map = new Map();
  rows.forEach((r) => map.set(String(r._id), { debitPaise: r.debitPaise, creditPaise: r.creditPaise, balancePaise: r.debitPaise - r.creditPaise }));
  return map;
};

/** Integrity check used by tests and the dashboard: every posted entry balances and totals match. */
export const verifyLedgerIntegrity = async () => {
  const bad = await JournalEntry.aggregate([
    { $addFields: { d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
    { $match: { $expr: { $or: [{ $ne: ['$d', '$c'] }, { $ne: ['$d', '$totalPaise'] }] } } },
    { $project: { entryNumber: 1, d: 1, c: 1, totalPaise: 1 } },
  ]);
  return { ok: bad.length === 0, unbalanced: bad };
};

export { Counter };

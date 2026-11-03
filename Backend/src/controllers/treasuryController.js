import mongoose from 'mongoose';
import TreasuryAccount, { ACCOUNT_TYPES, REAL_MONEY_TYPES } from '../models/TreasuryAccount.model.js';
import JournalEntry from '../models/JournalEntry.model.js';
import GatewayPayment from '../models/GatewayPayment.model.js';
import GatewaySettlement from '../models/GatewaySettlement.model.js';
import BankStatementEntry from '../models/BankStatementEntry.model.js';
import {
  ensureTreasuryIndexes, ensureSystemAccount, postEntry, reverseEntry, withTxn, accountBalances, actorOf, verifyLedgerIntegrity,
} from '../services/treasuryLedger.js';
import { dedupeKeyFor } from '../services/treasuryInbox.js';
import {
  postSettlement, syncSettlements, matchSettlementToStatement, unmatchSettlement, autoReconcile,
  syncRefundFromGateway, backfillGatewayCaptures, evaluateMatch,
} from '../services/razorpayTreasury.js';
import { toPaise, fromPaise } from '../utils/money.js';

/**
 * Cash & Bank treasury API. Security model:
 *  - routes require an authenticated admin / super_admin; the brand scope is resolved server-side
 *  - brandId and createdBy are NEVER read from the request; they come from the scope and the token
 *  - an object outside the caller's brand is reported as 404
 */

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const isSuper = (req) => req.user?.role === 'super_admin';
const scopeBrand = (req) => (!req.scope || req.scope.isAll ? null : req.scope.brandId);
const brandFilter = (req, field = 'brandId') => {
  const b = scopeBrand(req);
  return b ? { [field]: b } : {};
};
const inScope = (req, brandId) => !scopeBrand(req) || scopeBrand(req) === brandId;
const oid = (v) => (mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const MAX_PAISE = 100_000_000_000; // ₹1,000 crore sanity cap on a single movement

const uiType = (t) => (t === 'CASH' ? 'cash' : t === 'GATEWAY_CLEARING' ? 'gateway_clearing' : t === 'GATEWAY_FEE' ? 'gateway_fee' : 'bank');
export const serializeAccount = (a, bal) => ({
  id: String(a._id),
  accountName: a.name,
  type: uiType(a.type),
  accountType: a.type,
  isCash: a.type === 'CASH',
  isSystem: a.isSystem,
  isActive: a.isActive,
  isSettlementAccount: a.isSettlementAccount,
  brandId: a.brandId,
  bankName: a.bank?.bankName || '',
  accountHolder: a.bank?.accountHolder || '',
  maskedAccount: a.type === 'CASH' ? 'Physical Cash' : a.type === 'GATEWAY_CLEARING' ? 'Held by Razorpay' : a.type === 'GATEWAY_FEE' ? 'Fees and taxes' : a.bank?.maskedNumber || '',
  ifsc: a.bank?.ifsc || '',
  branch: a.bank?.branch || '',
  balance: fromPaise(bal?.balancePaise || 0),
  openingBalance: fromPaise(a.openingBalancePaise),
  openingBalanceDate: a.openingBalanceDate,
  notes: a.notes,
  createdAt: a.createdAt,
});

const loadAccount = async (req, res, id) => {
  const _id = oid(id);
  if (!_id) { fail(res, 404, 'Account not found'); return null; }
  const acc = await TreasuryAccount.findById(_id);
  if (!acc || (!inScope(req, acc.brandId))) { fail(res, 404, 'Account not found'); return null; }
  return acc;
};

const maskNumber = (n) => {
  const digits = String(n || '').replace(/\D/g, '');
  return digits.length >= 4 ? { last4: digits.slice(-4), maskedNumber: `•••• ${digits.slice(-4)}` } : { last4: '', maskedNumber: '' };
};

// ── Accounts ───────────────────────────────────────────────────────────────────────────────────
export const listAccounts = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const accounts = await TreasuryAccount.find({ ...brandFilter(req) }).sort({ isSystem: 1, type: 1, createdAt: 1 });
    const bals = await accountBalances(accounts.map((a) => a._id));
    res.json({ success: true, accounts: accounts.map((a) => serializeAccount(a, bals.get(String(a._id)))) });
  } catch (e) { next(e); }
};

export const createAccount = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const b = req.body || {};
    const type = String(b.type || '').toUpperCase();
    if (!ACCOUNT_TYPES.includes(type)) return fail(res, 400, 'Choose a valid account type.');
    // Brand comes from the selected scope. Only a Super Admin in "All Regions" may create a shared PLATFORM account.
    let brandId = scopeBrand(req);
    if (!brandId) {
      if (!isSuper(req)) return fail(res, 400, 'Select a specific brand before creating an account.');
      brandId = 'PLATFORM';
    }
    if (type === 'GATEWAY_CLEARING' || type === 'GATEWAY_FEE') {
      const acc = await ensureSystemAccount(type, brandId);
      return res.status(200).json({ success: true, account: serializeAccount(acc, null), message: 'System account ready.' });
    }
    const name = clean(b.accountName ?? b.name, 120);
    if (name.length < 2) return fail(res, 400, 'Please provide an account name.');
    let opening = 0;
    if (b.openingBalance !== undefined && b.openingBalance !== '' && b.openingBalance !== null) {
      opening = toPaise(b.openingBalance);
      if (opening === null || opening < 0 || opening > MAX_PAISE) return fail(res, 400, 'Opening balance must be a valid amount (zero or more).');
    }
    const bank = { bankName: '', accountHolder: '', last4: '', maskedNumber: '', ifsc: '', branch: '' };
    if (type !== 'CASH') {
      bank.bankName = clean(b.bankName, 80);
      bank.accountHolder = clean(b.accountHolder, 80);
      bank.branch = clean(b.branch, 80);
      const ifsc = clean(b.ifsc, 11).toUpperCase();
      if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return fail(res, 400, 'IFSC code is not valid.');
      bank.ifsc = ifsc;
      if (b.accountNumber) {
        const digits = String(b.accountNumber).replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 20) return fail(res, 400, 'Account number must be 6 to 20 digits.');
        Object.assign(bank, maskNumber(digits)); // only the masked form is kept; the full number is discarded
      }
    }
    if (await TreasuryAccount.exists({ brandId, name, isSystem: false })) return fail(res, 409, 'An account with this name already exists for this brand.');
    const actor = actorOf(req);
    const doc = await withTxn(async (session) => {
      const [acc] = await TreasuryAccount.create([{
        brandId, name, type, bank, notes: clean(b.notes, 500), openingBalancePaise: opening,
        openingBalanceDate: b.openingBalanceDate ? new Date(b.openingBalanceDate) : new Date(), createdBy: actor,
      }], session ? { session } : undefined);
      if (opening > 0) {
        await postEntry({
          description: `Opening balance - ${name}`, sourceModule: 'OPENING_BALANCE', sourceRef: String(acc._id),
          idempotencyKey: `open:${acc._id}`, entryDate: acc.openingBalanceDate, actor,
          lines: [{ accountId: acc._id, debitPaise: opening }, { systemCode: 'OPENING_EQUITY', brandId, creditPaise: opening }],
        }, { session });
      }
      return acc;
    });
    const bals = await accountBalances([doc._id]);
    res.status(201).json({ success: true, account: serializeAccount(doc, bals.get(String(doc._id))) });
  } catch (e) { next(e); }
};

export const updateAccount = async (req, res, next) => {
  try {
    const acc = await loadAccount(req, res, req.params.id); if (!acc) return;
    if (acc.isSystem) return fail(res, 400, 'System accounts cannot be edited.');
    const b = req.body || {};
    if (b.accountName !== undefined || b.name !== undefined) {
      const name = clean(b.accountName ?? b.name, 120);
      if (name.length < 2) return fail(res, 400, 'Please provide an account name.');
      if (name !== acc.name && await TreasuryAccount.exists({ brandId: acc.brandId, name, isSystem: false, _id: { $ne: acc._id } })) return fail(res, 409, 'An account with this name already exists for this brand.');
      acc.name = name;
    }
    if (acc.type !== 'CASH') {
      if (b.bankName !== undefined) acc.bank.bankName = clean(b.bankName, 80);
      if (b.accountHolder !== undefined) acc.bank.accountHolder = clean(b.accountHolder, 80);
      if (b.branch !== undefined) acc.bank.branch = clean(b.branch, 80);
      if (b.ifsc !== undefined) {
        const ifsc = clean(b.ifsc, 11).toUpperCase();
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return fail(res, 400, 'IFSC code is not valid.');
        acc.bank.ifsc = ifsc;
      }
      if (b.accountNumber) {
        const digits = String(b.accountNumber).replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 20) return fail(res, 400, 'Account number must be 6 to 20 digits.');
        Object.assign(acc.bank, maskNumber(digits));
      }
    }
    if (b.notes !== undefined) acc.notes = clean(b.notes, 500);
    if (b.isSettlementAccount !== undefined) {
      if (!isSuper(req)) return fail(res, 403, 'Only a Super Admin can choose the default settlement account.');
      if (b.isSettlementAccount && !['CURRENT', 'SAVINGS', 'ESCROW'].includes(acc.type)) return fail(res, 400, 'Only a bank account can receive Razorpay settlements.');
      if (b.isSettlementAccount) await TreasuryAccount.updateMany({ _id: { $ne: acc._id }, isSettlementAccount: true }, { $set: { isSettlementAccount: false } });
      acc.isSettlementAccount = !!b.isSettlementAccount;
    }
    acc.updatedBy = actorOf(req);
    await acc.save();
    const bals = await accountBalances([acc._id]);
    res.json({ success: true, account: serializeAccount(acc, bals.get(String(acc._id))) });
  } catch (e) { next(e); }
};

export const setAccountStatus = async (req, res, next) => {
  try {
    const acc = await loadAccount(req, res, req.params.id); if (!acc) return;
    if (acc.isSystem) return fail(res, 400, 'System accounts cannot be deactivated.');
    if (typeof req.body?.isActive !== 'boolean') return fail(res, 400, 'isActive must be true or false.');
    acc.isActive = req.body.isActive;
    if (!acc.isActive) acc.isSettlementAccount = false;
    acc.updatedBy = actorOf(req);
    await acc.save();
    const bals = await accountBalances([acc._id]);
    res.json({ success: true, account: serializeAccount(acc, bals.get(String(acc._id))) });
  } catch (e) { next(e); }
};

// ── Transactions (statement view of one account) ───────────────────────────────────────────────
const CATEGORY = {
  OPENING_BALANCE: 'Opening Balance', RAZORPAY_PAYMENT: 'Razorpay Collection', RAZORPAY_SETTLEMENT: 'Razorpay Settlement',
  RAZORPAY_REFUND: 'Customer Refund', TRANSFER: 'Internal Transfer', SELLER_PAYOUT: 'Seller Payout', CAPTAIN_PAYOUT: 'Captain Payout',
  COD_CASH: 'COD Cash', POS: 'POS Sales', EXPENSE: 'Expense', REVERSAL: 'Reversal', BANK_LINK: 'Bank Statement', MANUAL: 'Manual Entry',
};

export const accountStatement = async (accountId, { limit = 500, from, to } = {}) => {
  const entries = await JournalEntry.find({ 'lines.accountId': accountId }).sort({ entryDate: 1, createdAt: 1, _id: 1 }).lean();
  const nameIds = new Set();
  entries.forEach((e) => e.lines.forEach((l) => l.accountId && String(l.accountId) !== String(accountId) && nameIds.add(String(l.accountId))));
  const names = new Map((await TreasuryAccount.find({ _id: { $in: [...nameIds] } }).select('name').lean()).map((a) => [String(a._id), a.name]));
  let running = 0;
  const rows = entries.map((e) => {
    const mine = e.lines.filter((l) => String(l.accountId) === String(accountId));
    const net = mine.reduce((a, l) => a + l.debitPaise - l.creditPaise, 0);
    running += net;
    const other = e.lines.find((l) => String(l.accountId) !== String(accountId) && l.accountKind === 'TREASURY');
    const isTransfer = e.sourceModule === 'TRANSFER';
    return {
      id: String(e._id), entryNumber: e.entryNumber, accountId: String(accountId), date: e.entryDate, description: e.description,
      category: e.meta?.category || CATEGORY[e.sourceModule] || e.sourceModule,
      sourceModule: e.sourceModule, sourceRef: e.sourceRef,
      type: isTransfer ? 'transfer' : net >= 0 ? 'money_in' : 'money_out',
      transferType: isTransfer ? (net >= 0 ? 'in' : 'out') : undefined,
      targetAccountName: isTransfer && other ? names.get(String(other.accountId)) : undefined,
      amount: fromPaise(Math.abs(net)), amountSigned: fromPaise(net),
      paymentMode: e.meta?.paymentMode || '', referenceNumber: e.meta?.reference || e.sourceRef || '', notes: e.meta?.notes || '',
      runningBalance: fromPaise(running), status: e.status, createdBy: e.createdBy?.email || '',
    };
  });
  const filtered = rows.filter((r) => (!from || new Date(r.date) >= new Date(from)) && (!to || new Date(r.date) <= new Date(to)));
  return filtered.reverse().slice(0, limit);
};

export const getAccountTransactions = async (req, res, next) => {
  try {
    const acc = await loadAccount(req, res, req.params.id); if (!acc) return;
    const transactions = await accountStatement(acc._id, { limit: Math.min(2000, Number(req.query.limit) || 500), from: req.query.from, to: req.query.to });
    res.json({ success: true, transactions });
  } catch (e) { next(e); }
};

// ── Manual money movements ─────────────────────────────────────────────────────────────────────
const balanceOf = async (accountId, session) => {
  const rows = await JournalEntry.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.accountId': new mongoose.Types.ObjectId(String(accountId)) } },
    { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
  ]).session(session || null);
  return rows.length ? rows[0].d - rows[0].c : 0;
};

/** Bumps the account's ledgerVersion in the transaction so concurrent outflows conflict, then re-reads the balance. */
const lockAndCheckFunds = async (account, amountPaise, session) => {
  await TreasuryAccount.updateOne({ _id: account._id }, { $inc: { ledgerVersion: 1 } }, session ? { session } : undefined);
  const bal = await balanceOf(account._id, session);
  if (bal < amountPaise) {
    throw Object.assign(new Error(`Insufficient funds in ${account.name}. Available: ₹${fromPaise(bal).toLocaleString('en-IN')}`), { status: 400 });
  }
};

const requireMoneyAccount = (acc) => acc && acc.isActive && REAL_MONEY_TYPES.includes(acc.type);

export const addReduceMoney = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const b = req.body || {};
    const acc = await loadAccount(req, res, b.accountId); if (!acc) return;
    if (!requireMoneyAccount(acc)) return fail(res, 400, 'Manual entries are only allowed on active cash and bank accounts.');
    if (!['money_in', 'money_out'].includes(b.type)) return fail(res, 400, 'Invalid transaction type.');
    const amount = toPaise(b.amount);
    if (!amount || amount <= 0 || amount > MAX_PAISE) return fail(res, 400, 'Transaction amount must be greater than zero.');
    if (!b.date || Number.isNaN(new Date(b.date).getTime())) return fail(res, 400, 'Please select a valid transaction date.');
    const category = clean(b.category, 80) || (b.type === 'money_in' ? 'Miscellaneous Receipt' : 'Miscellaneous Expense');
    const idem = clean(b.idempotencyKey, 80);
    const actor = actorOf(req);
    const result = await withTxn(async (session) => {
      if (b.type === 'money_out') await lockAndCheckFunds(acc, amount, session);
      return postEntry({
        description: clean(b.notes || category, 300) || category, sourceModule: 'MANUAL', sourceRef: clean(b.referenceNumber, 80),
        idempotencyKey: idem ? `manual:${acc._id}:${idem}` : `manual:${acc._id}:${new mongoose.Types.ObjectId()}`,
        entryDate: b.date, actor, meta: { category, paymentMode: clean(b.paymentMode, 40), reference: clean(b.referenceNumber, 80), notes: clean(b.notes, 300) },
        lines: b.type === 'money_in'
          ? [{ accountId: acc._id, debitPaise: amount }, { systemCode: 'OTHER_INCOME', brandId: acc.brandId, creditPaise: amount }]
          : [{ systemCode: 'EXPENSES', brandId: acc.brandId, debitPaise: amount }, { accountId: acc._id, creditPaise: amount }],
      }, { session });
    });
    res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, entryId: result.entry._id, entryNumber: result.entry.entryNumber });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const transferMoney = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const b = req.body || {};
    const from = await loadAccount(req, res, b.fromAccountId); if (!from) return;
    const to = await loadAccount(req, res, b.toAccountId); if (!to) return;
    if (String(from._id) === String(to._id)) return fail(res, 400, 'Source and destination accounts must be different.');
    if (!requireMoneyAccount(from) || !requireMoneyAccount(to)) return fail(res, 400, 'Transfers are only allowed between active cash and bank accounts.');
    if (from.brandId !== to.brandId && !isSuper(req)) return fail(res, 403, 'Only a Super Admin can move money between brands.');
    const amount = toPaise(b.amount);
    if (!amount || amount <= 0 || amount > MAX_PAISE) return fail(res, 400, 'Transfer amount must be greater than zero.');
    if (!b.date || Number.isNaN(new Date(b.date).getTime())) return fail(res, 400, 'Please specify a transfer date.');
    const ref = clean(b.referenceNumber, 80) || `TRF-${Date.now().toString().slice(-6)}`;
    const idem = clean(b.idempotencyKey, 80);
    const result = await withTxn(async (session) => {
      await lockAndCheckFunds(from, amount, session);
      return postEntry({
        description: `Transfer from ${from.name} to ${to.name}`, sourceModule: 'TRANSFER', sourceRef: ref,
        idempotencyKey: idem ? `transfer:${from._id}:${idem}` : `transfer:${from._id}:${new mongoose.Types.ObjectId()}`,
        entryDate: b.date, actor: actorOf(req), meta: { category: 'Internal Transfer', paymentMode: clean(b.paymentMode, 40), reference: ref, notes: clean(b.notes, 300) },
        lines: [{ accountId: to._id, debitPaise: amount }, { accountId: from._id, creditPaise: amount }],
      }, { session });
    });
    res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, entryNumber: result.entry.entryNumber });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const reverseJournalEntry = async (req, res, next) => {
  try {
    const entry = oid(req.params.id) ? await JournalEntry.findById(req.params.id).lean() : null;
    if (!entry) return fail(res, 404, 'Entry not found');
    const touchesScope = entry.lines.some((l) => l.brandId && inScope(req, l.brandId));
    const allInScope = entry.lines.every((l) => !l.brandId || inScope(req, l.brandId));
    if (!isSuper(req) && !(touchesScope && allInScope)) return fail(res, 404, 'Entry not found');
    if (['RAZORPAY_PAYMENT', 'RAZORPAY_SETTLEMENT', 'RAZORPAY_REFUND'].includes(entry.sourceModule)) {
      return fail(res, 409, 'Entries created from Razorpay data cannot be reversed by hand. Correct the underlying gateway record instead.');
    }
    const out = await reverseEntry(entry._id, { actor: actorOf(req), reason: req.body?.reason });
    res.status(201).json({ success: true, reversalEntryNumber: out.reversal.entryNumber });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); if (/reason is required/.test(e.message)) return fail(res, 400, e.message); next(e); }
};

export const listJournal = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const q = {};
    const b = scopeBrand(req);
    if (b) q.$or = [{ brandId: b }, { 'lines.brandId': b }];
    if (req.query.sourceModule) q.sourceModule = String(req.query.sourceModule);
    if (req.query.accountId && oid(req.query.accountId)) q['lines.accountId'] = oid(req.query.accountId);
    const [rows, total] = await Promise.all([
      JournalEntry.find(q).sort({ entryDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      JournalEntry.countDocuments(q),
    ]);
    res.json({ success: true, total, page, entries: rows });
  } catch (e) { next(e); }
};

// ── Unlinked transactions / bank statement lines ───────────────────────────────────────────────
const serializeUnlinked = (u) => ({
  id: String(u._id), date: u.entryDate, description: u.description, amount: fromPaise(u.amountPaise),
  type: u.direction === 'CREDIT' ? 'money_in' : 'money_out', direction: u.direction, source: u.source,
  sourceRef: u.sourceRef, referenceNumber: u.reference, suggestedCategory: u.suggestedCategory, status: u.status,
  accountId: u.accountId ? String(u.accountId) : null, matchedSettlementId: u.matchedSettlementId ? String(u.matchedSettlementId) : null,
  brandId: u.brandId, notes: u.notes,
});

export const listUnlinked = async (req, res, next) => {
  try {
    const q = { ...brandFilter(req) };
    q.status = req.query.status && req.query.status !== 'all' ? String(req.query.status).toUpperCase() : 'UNMATCHED';
    const rows = await BankStatementEntry.find(q).sort({ entryDate: -1 }).limit(500).lean();
    res.json({ success: true, unlinked: rows.map(serializeUnlinked) });
  } catch (e) { next(e); }
};

const buildStatementDoc = async (req, res, row, defaultAccount) => {
  const amountPaise = toPaise(row.amount);
  if (!amountPaise || amountPaise <= 0 || amountPaise > MAX_PAISE) { fail(res, 400, 'Amount must be greater than zero.'); return null; }
  if (!row.date || Number.isNaN(new Date(row.date).getTime())) { fail(res, 400, 'A valid date is required.'); return null; }
  const direction = String(row.direction || 'CREDIT').toUpperCase();
  if (!['CREDIT', 'DEBIT'].includes(direction)) { fail(res, 400, 'Direction must be CREDIT or DEBIT.'); return null; }
  const acc = defaultAccount;
  return {
    brandId: acc.brandId === 'PLATFORM' ? 'unassigned' : acc.brandId, accountId: acc._id, entryDate: new Date(row.date), amountPaise, direction,
    description: clean(row.description, 300), reference: clean(row.reference ?? row.referenceNumber, 80), source: 'BANK_STATEMENT',
    dedupeKey: dedupeKeyFor({ source: 'BANK_STATEMENT', accountId: String(acc._id), date: row.date, amountPaise, direction, reference: row.reference ?? row.referenceNumber }),
    createdBy: actorOf(req),
  };
};

export const addUnlinked = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const acc = await loadAccount(req, res, req.body?.accountId); if (!acc) return;
    if (!['CURRENT', 'SAVINGS', 'ESCROW'].includes(acc.type)) return fail(res, 400, 'Bank statement lines belong to a bank account.');
    const doc = await buildStatementDoc(req, res, req.body || {}, acc); if (!doc) return;
    try {
      const created = await BankStatementEntry.create(doc);
      res.status(201).json({ success: true, entry: serializeUnlinked(created) });
    } catch (e) {
      if (e?.code === 11000) return fail(res, 409, 'This bank statement line was already added.');
      throw e;
    }
  } catch (e) { next(e); }
};

export const importUnlinked = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const acc = await loadAccount(req, res, req.body?.accountId); if (!acc) return;
    if (!['CURRENT', 'SAVINGS', 'ESCROW'].includes(acc.type)) return fail(res, 400, 'Bank statement lines belong to a bank account.');
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0 || rows.length > 500) return fail(res, 400, 'Send between 1 and 500 statement rows.');
    const out = { added: 0, duplicates: 0, invalid: 0 };
    for (const r of rows) {
      const amountPaise = toPaise(r.amount);
      if (!amountPaise || amountPaise <= 0 || !r.date || Number.isNaN(new Date(r.date).getTime())) { out.invalid += 1; continue; }
      const direction = String(r.direction || 'CREDIT').toUpperCase() === 'DEBIT' ? 'DEBIT' : 'CREDIT';
      try {
        await BankStatementEntry.create({
          brandId: acc.brandId === 'PLATFORM' ? 'unassigned' : acc.brandId, accountId: acc._id, entryDate: new Date(r.date), amountPaise, direction,
          description: clean(r.description, 300), reference: clean(r.reference, 80), source: 'BANK_STATEMENT', createdBy: actorOf(req),
          dedupeKey: dedupeKeyFor({ source: 'BANK_STATEMENT', accountId: String(acc._id), date: r.date, amountPaise, direction, reference: r.reference }),
        });
        out.added += 1;
      } catch (e) { if (e?.code === 11000) out.duplicates += 1; else throw e; }
    }
    res.status(201).json({ success: true, ...out });
  } catch (e) { next(e); }
};

const loadUnlinked = async (req, res) => {
  const _id = oid(req.params.id);
  const u = _id ? await BankStatementEntry.findById(_id) : null;
  if (!u || !inScope(req, u.brandId)) { fail(res, 404, 'Transaction not found'); return null; }
  return u;
};

export const linkUnlinked = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const u = await loadUnlinked(req, res); if (!u) return;
    if (u.status !== 'UNMATCHED') return fail(res, 409, 'This transaction has already been matched or allocated.');
    const acc = await loadAccount(req, res, req.body?.targetAccountId); if (!acc) return;
    if (!requireMoneyAccount(acc)) return fail(res, 400, 'Select an active cash or bank account.');
    if (u.brandId !== 'unassigned' && u.brandId !== acc.brandId && acc.brandId !== 'PLATFORM' && !isSuper(req)) return fail(res, 403, 'This transaction belongs to a different brand.');
    // A bank credit that is really a Razorpay settlement must be MATCHED, not booked as income (it is already in the book).
    if (u.source === 'BANK_STATEMENT' && u.direction === 'CREDIT' && !req.body?.force) {
      const open = await GatewaySettlement.find({ status: 'processed', matchedStatementId: null, reconStatus: { $ne: 'MATCHED' } });
      if (open.some((s) => evaluateMatch(s, u) || s.netPaise === u.amountPaise)) {
        return fail(res, 409, 'This looks like a Razorpay settlement credit. Match it to the settlement instead of booking it as new income (it is already in the ledger).');
      }
    }
    const claimed = await BankStatementEntry.findOneAndUpdate({ _id: u._id, status: 'UNMATCHED' }, { $set: { status: 'LINKED' } }, { returnDocument: 'after' });
    if (!claimed) return fail(res, 409, 'This transaction has already been matched or allocated.');
    const category = clean(req.body?.category, 80) || u.suggestedCategory || (u.direction === 'CREDIT' ? 'Miscellaneous Receipt' : 'Miscellaneous Expense');
    const counter = u.source === 'SELLER_PAYOUT' ? 'SELLER_PAYOUTS' : u.source === 'CAPTAIN_PAYOUT' ? 'CAPTAIN_PAYOUTS' : u.source === 'COD_CASH' ? 'COD_COLLECTIONS' : u.source === 'POS' ? 'POS_SALES' : u.direction === 'CREDIT' ? 'OTHER_INCOME' : 'EXPENSES';
    const moduleName = u.source === 'SELLER_PAYOUT' ? 'SELLER_PAYOUT' : u.source === 'CAPTAIN_PAYOUT' ? 'CAPTAIN_PAYOUT' : u.source === 'COD_CASH' ? 'COD_CASH' : u.source === 'POS' ? 'POS' : 'BANK_LINK';
    try {
      const result = await withTxn(async (session) => {
        if (u.direction === 'DEBIT') await lockAndCheckFunds(acc, u.amountPaise, session);
        return postEntry({
          description: clean(req.body?.notes, 300) || u.description || category, sourceModule: moduleName, sourceRef: u.sourceRef || String(u._id),
          idempotencyKey: `link:${u._id}`, entryDate: u.entryDate, actor: actorOf(req),
          meta: { category, reference: clean(req.body?.referenceNumber, 80) || u.reference, notes: clean(req.body?.notes, 300) },
          lines: u.direction === 'CREDIT'
            ? [{ accountId: acc._id, debitPaise: u.amountPaise }, { systemCode: counter, brandId: acc.brandId, creditPaise: u.amountPaise }]
            : [{ systemCode: counter, brandId: acc.brandId, debitPaise: u.amountPaise }, { accountId: acc._id, creditPaise: u.amountPaise }],
        }, { session });
      });
      await BankStatementEntry.updateOne({ _id: u._id }, { $set: { linkedEntryId: result.entry._id, accountId: acc._id } });
      res.json({ success: true, entryNumber: result.entry.entryNumber });
    } catch (e) {
      await BankStatementEntry.updateOne({ _id: u._id, status: 'LINKED' }, { $set: { status: 'UNMATCHED' } });
      throw e;
    }
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const ignoreUnlinked = async (req, res, next) => {
  try {
    const u = await loadUnlinked(req, res); if (!u) return;
    const r = await BankStatementEntry.updateOne({ _id: u._id, status: 'UNMATCHED' }, { $set: { status: 'IGNORED', notes: clean(req.body?.reason, 300) } });
    if (!r.modifiedCount) return fail(res, 409, 'This transaction has already been matched or allocated.');
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ── Razorpay: payments, settlements, reconciliation ────────────────────────────────────────────
const serializePayment = (p) => ({
  id: String(p._id), razorpayPaymentId: p.razorpayPaymentId, razorpayOrderId: p.razorpayOrderId, orderId: p.orderNumber, brandId: p.brandId,
  amount: fromPaise(p.amountPaise), status: p.status, method: p.method, capturedAt: p.capturedAt, failureReason: p.failureReason,
  refunded: fromPaise(p.refundedPaise), refundPending: fromPaise(p.refundPendingPaise), settlementId: p.settlementId,
  reportedFee: p.reportedFeePaise === null ? null : fromPaise(p.reportedFeePaise), reportedTax: p.reportedTaxPaise === null ? null : fromPaise(p.reportedTaxPaise),
  audit: (p.audit || []).map((a) => ({ at: a.at, source: a.source, event: a.event, status: a.status, note: a.note })),
});

export const listGatewayPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const q = { ...brandFilter(req) };
    if (req.query.status && req.query.status !== 'all') q.status = String(req.query.status);
    const [rows, total] = await Promise.all([GatewayPayment.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), GatewayPayment.countDocuments(q)]);
    res.json({ success: true, total, page, payments: rows.map(serializePayment) });
  } catch (e) { next(e); }
};

const settlementScope = (req) => {
  const b = scopeBrand(req);
  return b ? { $or: [{ brandId: b }, { 'brandBreakdown.brandId': b }] } : {};
};

const serializeSettlement = (s, accounts = new Map()) => ({
  id: String(s._id), settlementId: s.razorpaySettlementId, status: s.status, settledAt: s.settledAt, utr: s.utr,
  net: fromPaise(s.netPaise), fees: fromPaise(s.feePaise), tax: fromPaise(s.taxPaise), gross: fromPaise(s.grossPaise),
  refunds: fromPaise(s.refundPaise), adjustments: fromPaise(s.adjustmentPaise), itemized: s.itemized,
  destinationAccountId: s.destinationAccountId ? String(s.destinationAccountId) : null,
  destinationAccount: s.destinationAccountId ? accounts.get(String(s.destinationAccountId)) || '' : '',
  posted: !!s.postedEntryId, postedAt: s.postedAt, reconStatus: s.reconStatus, discrepancy: fromPaise(s.discrepancyPaise),
  discrepancyNote: s.discrepancyNote, matchedStatementId: s.matchedStatementId ? String(s.matchedStatementId) : null, brandId: s.brandId, source: s.source,
});

export const listSettlements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const q = { ...settlementScope(req) };
    if (req.query.status && req.query.status !== 'all') q.status = String(req.query.status);
    if (req.query.recon && req.query.recon !== 'all') q.reconStatus = String(req.query.recon).toUpperCase();
    const [rows, total] = await Promise.all([GatewaySettlement.find(q).sort({ settledAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), GatewaySettlement.countDocuments(q)]);
    const ids = [...new Set(rows.map((r) => r.destinationAccountId).filter(Boolean).map(String))];
    const accounts = new Map((await TreasuryAccount.find({ _id: { $in: ids } }).select('name').lean()).map((a) => [String(a._id), a.name]));
    res.json({ success: true, total, page, settlements: rows.map((s) => serializeSettlement(s, accounts)) });
  } catch (e) { next(e); }
};

export const getSettlement = async (req, res, next) => {
  try {
    const s = oid(req.params.id) ? await GatewaySettlement.findById(req.params.id).lean() : null;
    if (!s) return fail(res, 404, 'Settlement not found');
    const b = scopeBrand(req);
    if (b && s.brandId !== b && !(s.brandBreakdown || []).some((x) => x.brandId === b)) return fail(res, 404, 'Settlement not found');
    res.json({ success: true, settlement: { ...serializeSettlement(s), items: s.items.map((i) => ({ ...i, amount: fromPaise(i.amountPaise), fee: fromPaise(i.feePaise) })) } });
  } catch (e) { next(e); }
};

export const syncRazorpaySettlements = async (req, res, next) => {
  try {
    const to = req.body?.to ? new Date(req.body.to) : new Date();
    const from = req.body?.from ? new Date(req.body.from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return fail(res, 400, 'Choose a valid date range.');
    if (to - from > 93 * 24 * 3600 * 1000) return fail(res, 400, 'Sync at most 93 days at a time.');
    const result = await syncSettlements({ from, to });
    res.json({ success: true, ...result });
  } catch (e) { if (e.name === 'GatewayError') return fail(res, e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 502, e.message); next(e); }
};

export const postRazorpaySettlement = async (req, res, next) => {
  try {
    const out = await postSettlement(req.params.id, { destinationAccountId: req.body?.destinationAccountId, actor: actorOf(req) });
    res.status(out.duplicate ? 200 : 201).json({ success: true, entryNumber: out.entry.entryNumber, settlement: serializeSettlement(out.settlement.toObject ? out.settlement.toObject() : out.settlement) });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const matchRazorpaySettlement = async (req, res, next) => {
  try {
    const s = oid(req.params.id) ? await GatewaySettlement.findById(req.params.id).lean() : null;
    if (!s) return fail(res, 404, 'Settlement not found');
    const b = scopeBrand(req);
    if (b && s.brandId !== b && !(s.brandBreakdown || []).some((x) => x.brandId === b)) return fail(res, 404, 'Settlement not found');
    const out = await matchSettlementToStatement(req.params.id, req.body?.statementId, { confirm: req.body?.confirm !== false });
    res.json({ success: true, ...out });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const unmatchRazorpaySettlement = async (req, res, next) => {
  try {
    await unmatchSettlement(req.params.id);
    res.json({ success: true });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); next(e); }
};

export const autoReconcileRazorpay = async (req, res, next) => {
  try { res.json({ success: true, ...(await autoReconcile({ brandFilter: settlementScope(req) })) }); } catch (e) { next(e); }
};

export const getReconciliation = async (req, res, next) => {
  try {
    const sq = { status: 'processed', ...settlementScope(req) };
    const [rows, credits] = await Promise.all([
      GatewaySettlement.find(sq).sort({ settledAt: -1 }).limit(300).lean(),
      BankStatementEntry.find({ ...brandFilter(req), direction: 'CREDIT', status: 'UNMATCHED', source: 'BANK_STATEMENT' }).sort({ entryDate: -1 }).limit(300).lean(),
    ]);
    const by = (st) => rows.filter((r) => r.reconStatus === st).map((s) => serializeSettlement(s));
    res.json({
      success: true,
      matched: by('MATCHED'), pending: by('PENDING'), partial: by('PARTIAL'), discrepancies: by('DISCREPANCY'),
      unmatchedBankCredits: credits.map(serializeUnlinked),
      counts: { matched: by('MATCHED').length, pending: by('PENDING').length, partial: by('PARTIAL').length, discrepancies: by('DISCREPANCY').length, unmatchedBankCredits: credits.length },
    });
  } catch (e) { next(e); }
};

export const syncGatewayRefund = async (req, res, next) => {
  try {
    const out = await syncRefundFromGateway(req.params.id);
    res.json({ success: true, gatewayStatus: out.gatewayStatus, status: out.refund.status });
  } catch (e) { if (e.status) return fail(res, e.status, e.message); if (e.name === 'GatewayError') return fail(res, e.statusCode, e.message); next(e); }
};

export const backfillCaptures = async (req, res, next) => {
  try { res.json({ success: true, ...(await backfillGatewayCaptures({})) }); } catch (e) { next(e); }
};

// ── Dashboard ──────────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    await ensureTreasuryIndexes();
    const filter = String(req.query.filter || 'all').toLowerCase(); // all | cash | bank | clearing
    const accounts = await TreasuryAccount.find({ ...brandFilter(req) }).sort({ isSystem: 1, type: 1, createdAt: 1 });
    const bals = await accountBalances(accounts.map((a) => a._id));
    const bp = (a) => bals.get(String(a._id))?.balancePaise || 0;
    const sum = (types) => accounts.filter((a) => types.includes(a.type)).reduce((t, a) => t + bp(a), 0);
    const cashPaise = sum(['CASH']);
    const bankPaise = sum(['CURRENT', 'SAVINGS', 'ESCROW']);
    const clearingPaise = sum(['GATEWAY_CLEARING']);
    const feePaise = sum(['GATEWAY_FEE']);
    const visible = accounts.filter((a) => filter === 'cash' ? a.type === 'CASH' : filter === 'bank' ? ['CURRENT', 'SAVINGS', 'ESCROW'].includes(a.type) : filter === 'clearing' ? a.type === 'GATEWAY_CLEARING' : true);

    const pb = brandFilter(req);
    const [collected, refunded, failedCount, settlementsAgg, pendingSettlements, unlinkedAgg] = await Promise.all([
      GatewayPayment.aggregate([{ $match: { ...pb, status: { $in: ['captured', 'refunded', 'partially_refunded'] } } }, { $group: { _id: null, paise: { $sum: '$amountPaise' }, n: { $sum: 1 } } }]),
      GatewayPayment.aggregate([{ $match: { ...pb } }, { $group: { _id: null, paise: { $sum: '$refundedPaise' }, pending: { $sum: '$refundPendingPaise' } } }]),
      GatewayPayment.countDocuments({ ...pb, status: 'failed' }),
      GatewaySettlement.aggregate([{ $match: { ...settlementScope(req), postedEntryId: { $ne: null } } }, { $group: { _id: null, n: { $sum: 1 }, net: { $sum: '$netPaise' }, fees: { $sum: '$feePaise' } } }]),
      GatewaySettlement.aggregate([{ $match: { ...settlementScope(req), postedEntryId: null, status: { $in: ['created', 'processed'] } } }, { $group: { _id: null, n: { $sum: 1 }, net: { $sum: '$netPaise' } } }]),
      BankStatementEntry.aggregate([{ $match: { ...brandFilter(req), status: 'UNMATCHED' } }, { $group: { _id: null, n: { $sum: 1 }, paise: { $sum: '$amountPaise' } } }]),
    ]);

    // Money in / out of real accounts (internal transfers and opening balances are not business income or spend)
    const realIds = accounts.filter((a) => REAL_MONEY_TYPES.includes(a.type)).map((a) => a._id);
    let moneyInPaise = 0, moneyOutPaise = 0;
    if (realIds.length) {
      const match = { sourceModule: { $nin: ['TRANSFER', 'OPENING_BALANCE'] } };
      if (req.query.from || req.query.to) match.entryDate = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
      const flow = await JournalEntry.aggregate([
        { $match: match }, { $unwind: '$lines' }, { $match: { 'lines.accountId': { $in: realIds } } },
        { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
      ]);
      if (flow.length) { moneyInPaise = flow[0].d; moneyOutPaise = flow[0].c; }
    }
    const integrity = isSuper(req) ? await verifyLedgerIntegrity() : undefined;
    res.json({
      success: true, filter,
      accounts: visible.map((a) => serializeAccount(a, bals.get(String(a._id)))),
      summary: {
        totalNetBalance: fromPaise(cashPaise + bankPaise), // real money only (clearing is NOT in the bank yet)
        cashInHand: fromPaise(cashPaise), bankBalance: fromPaise(bankPaise), razorpayClearing: fromPaise(clearingPaise),
        totalIncludingClearing: fromPaise(cashPaise + bankPaise + clearingPaise),
        razorpayCollections: fromPaise(collected[0]?.paise || 0), razorpayPaymentsCount: collected[0]?.n || 0,
        pendingSettlements: fromPaise(clearingPaise), pendingSettlementRecords: pendingSettlements[0]?.n || 0,
        completedSettlements: settlementsAgg[0]?.n || 0, completedSettlementAmount: fromPaise(settlementsAgg[0]?.net || 0),
        gatewayFees: fromPaise(feePaise), refunds: fromPaise(refunded[0]?.paise || 0), refundsInProgress: fromPaise(refunded[0]?.pending || 0),
        failedPayments: failedCount, totalMoneyIn: fromPaise(moneyInPaise), totalMoneyOut: fromPaise(moneyOutPaise),
        unlinkedCount: unlinkedAgg[0]?.n || 0, unlinkedTotal: fromPaise(unlinkedAgg[0]?.paise || 0),
      },
      integrity,
    });
  } catch (e) { next(e); }
};

// ── Exports ────────────────────────────────────────────────────────────────────────────────────
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const toCsv = (headers, rows) => '﻿' + [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
const xmlEsc = (v) => String(v ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
// Excel-compatible SpreadsheetML (opens in Excel and LibreOffice without an extra dependency)
const toExcelXml = (sheet, headers, rows) => `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEsc(sheet).slice(0, 31)}"><Table>
<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('')}</Row>
${rows.map((r) => `<Row>${r.map((v) => (typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`)).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;

const sendExport = (res, format, name, headers, rows) => {
  if (format === 'xlsx' || format === 'xls' || format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.xls"`);
    return res.send(toExcelXml(name, headers, rows));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  return res.send(toCsv(headers, rows));
};

export const exportTransactions = async (req, res, next) => {
  try {
    const q = { ...brandFilter(req) };
    if (req.query.accountId) { const a = await loadAccount(req, res, req.query.accountId); if (!a) return; q._id = a._id; }
    const accounts = await TreasuryAccount.find(q);
    const rows = [];
    for (const a of accounts) {
      const tx = await accountStatement(a._id, { limit: 5000, from: req.query.from, to: req.query.to });
      tx.forEach((t) => rows.push([a.name, a.type, new Date(t.date).toISOString().slice(0, 10), t.entryNumber, t.category, t.description, t.referenceNumber, t.type === 'money_out' || (t.type === 'transfer' && t.transferType === 'out') ? t.amount : 0, t.type === 'money_in' || (t.type === 'transfer' && t.transferType === 'in') ? t.amount : 0, t.runningBalance, t.status, t.createdBy]));
    }
    sendExport(res, String(req.query.format || 'csv').toLowerCase(), 'treasury-transactions', ['Account', 'Type', 'Date', 'Entry', 'Category', 'Description', 'Reference', 'Money Out', 'Money In', 'Balance', 'Status', 'Posted By'], rows);
  } catch (e) { next(e); }
};

export const exportSettlements = async (req, res, next) => {
  try {
    const list = await GatewaySettlement.find({ ...settlementScope(req) }).sort({ settledAt: -1 }).limit(5000).lean();
    const rows = list.map((s) => [s.razorpaySettlementId, s.status, s.settledAt ? new Date(s.settledAt).toISOString().slice(0, 10) : '', s.utr, fromPaise(s.grossPaise), fromPaise(s.feePaise), fromPaise(s.taxPaise), fromPaise(s.netPaise), s.reconStatus, fromPaise(s.discrepancyPaise), s.postedEntryId ? 'Yes' : 'No']);
    sendExport(res, String(req.query.format || 'csv').toLowerCase(), 'razorpay-settlements', ['Settlement ID', 'Status', 'Date', 'UTR', 'Gross', 'Fees (incl. tax)', 'Tax', 'Net', 'Reconciliation', 'Difference', 'Posted'], rows);
  } catch (e) { next(e); }
};

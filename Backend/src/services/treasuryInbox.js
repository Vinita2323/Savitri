import crypto from 'crypto';
import BankStatementEntry from '../models/BankStatementEntry.model.js';
import { ensureTreasuryIndexes, SYSTEM_ACTOR } from './treasuryLedger.js';

/**
 * The "Unlinked Transactions" inbox: money movements that happened elsewhere in the platform (a payout
 * marked paid, COD cash handed in, a POS takings batch) or on a bank statement, and that still need a
 * treasury account before they can be posted to the book. Queuing is idempotent per source reference,
 * so a retried hook or a re-saved document never creates a duplicate.
 */
export const dedupeKeyFor = ({ source, sourceRef, accountId, date, amountPaise, direction, reference }) => {
  if (sourceRef) return `src:${source}:${sourceRef}`;
  const raw = [accountId || '', new Date(date).toISOString().slice(0, 10), amountPaise, direction, String(reference || '').toUpperCase().trim()].join('|');
  return 'stmt:' + crypto.createHash('sha1').update(raw).digest('hex');
};

export const queueUnlinked = async ({
  brandId, source, sourceRef, amountPaise, direction, description, reference = '', date = new Date(),
  suggestedCategory = '', accountId = null, actor = SYSTEM_ACTOR,
}) => {
  await ensureTreasuryIndexes();
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { skipped: 'bad_amount' };
  const dedupeKey = dedupeKeyFor({ source, sourceRef, accountId, date, amountPaise, direction, reference });
  try {
    const doc = await BankStatementEntry.create({
      brandId: brandId || 'unassigned', accountId, entryDate: new Date(date), amountPaise, direction,
      description: String(description || '').slice(0, 300), reference, source, sourceRef: sourceRef || '',
      suggestedCategory, dedupeKey, createdBy: { id: actor.id, email: actor.email, role: actor.role },
    });
    return { created: true, entry: doc };
  } catch (e) {
    if (e?.code === 11000) return { created: false, duplicate: true };
    throw e;
  }
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;
/** Brand of a seller (unassigned when it has none). */
export const brandForSeller = async (sellerId) => {
  if (!OBJECT_ID.test(String(sellerId || ''))) return 'unassigned';
  const { default: Seller } = await import('../models/Seller.model.js');
  const s = await Seller.findById(sellerId).select('brandId').lean();
  return s?.brandId || 'unassigned';
};
/** Captains carry only a city; attribute them to a brand only when exactly one brand operates in that city. */
export const brandForCaptain = async (captain) => {
  const city = captain?.city || captain?.workingArea?.city;
  if (!city) return 'unassigned';
  const { default: Brand } = await import('../models/Brand.model.js');
  const escaped = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const brands = await Brand.find({ city: new RegExp('^' + escaped + '$', 'i') }).select('brandId').lean();
  return brands.length === 1 ? brands[0].brandId : 'unassigned';
};

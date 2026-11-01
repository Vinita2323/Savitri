/**
 * READ-ONLY report of captain records that cannot be attributed to a brand because they declare
 * no operating city (neither `city` nor `workingArea.city`). Nothing is modified and no brand is
 * guessed: each listed record needs its city completed by the captain or by an admin.
 *
 *   node src/scripts/reportCaptainsMissingCity.js            (uses MONGODB_URI from the environment / .env)
 *   node src/scripts/reportCaptainsMissingCity.js --json
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Captain from '../models/Captain.model.js';
import PayoutRequest from '../models/PayoutRequest.model.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
await mongoose.connect(process.env.MONGODB_URI);

const missing = await Captain.find({
  $and: [
    { $or: [{ city: { $exists: false } }, { city: '' }, { city: null }] },
    { $or: [{ 'workingArea.city': { $exists: false } }, { 'workingArea.city': '' }, { 'workingArea.city': null }] },
  ],
})
  .select('name phone state pinCode currentAddress status accountStatus createdAt')
  .lean();

const ids = missing.map((c) => String(c._id));
const openPayouts = await PayoutRequest.aggregate([
  { $match: { recipientType: 'CAPTAIN', recipientId: { $in: ids }, status: { $in: ['PENDING', 'APPROVED', 'PROCESSING'] } } },
  { $group: { _id: '$recipientId', open: { $sum: 1 }, amount: { $sum: '$requestedAmount' } } },
]);
const openMap = new Map(openPayouts.map((p) => [p._id, p]));

const rows = missing.map((c) => ({
  captainId: String(c._id),
  name: c.name || '',
  phone: c.phone || '',
  state: c.state || '',
  pinCode: c.pinCode || '',
  address: (c.currentAddress || '').slice(0, 60),
  status: c.accountStatus || c.status || '',
  openPayoutRequests: openMap.get(String(c._id))?.open || 0,
  openPayoutAmount: openMap.get(String(c._id))?.amount || 0,
}));

if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else {
  console.log(`Captains with no operating city (cannot be attributed to a brand): ${rows.length}`);
  console.table(rows);
}
await mongoose.disconnect();

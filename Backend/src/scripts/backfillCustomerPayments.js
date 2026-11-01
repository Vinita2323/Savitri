/**
 * One-off, opt-in backfill: writes a CUSTOMER_PAYMENT ledger row for every already-Paid order that
 * has none, so the Super Admin "Customer Payments" page also shows history.
 * Idempotent (safe to re-run). Run explicitly:  node src/scripts/backfillCustomerPayments.js
 * Uses MONGODB_URI from the environment / .env - point it at the intended database first.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import { recordCustomerPayment } from '../utils/ledgerHelper.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

await mongoose.connect(process.env.MONGODB_URI);
let created = 0;
let scanned = 0;
for await (const o of Order.find({ paymentStatus: 'Paid', grandTotal: { $gt: 0 } }).select('_id').cursor()) {
  scanned += 1;
  if (await recordCustomerPayment(o._id)) created += 1;
}
console.log(`Scanned ${scanned} paid orders, created ${created} CUSTOMER_PAYMENT ledger rows.`);
await mongoose.disconnect();

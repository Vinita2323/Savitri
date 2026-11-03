# Cash & Bank Treasury with Razorpay - Implementation Report

Status: implemented and tested in an isolated database with a Razorpay test double. Nothing is committed, pushed or deployed.

## 1. What existed before
| Area | Finding |
|---|---|
| Razorpay orders / signature verify / webhook | Already built and sound (`orderController.createRazorpayOrder`, `verifyRazorpayPayment`, `razorpayWebhookController` with raw-body HMAC and a unique-event-id idempotency table). Kept; extended, not duplicated. |
| Cash & Bank page | 100 % browser demo data in `localStorage` with fake HDFC / ICICI / SBI balances. No backend at all. |
| Ledger | `PlatformLedger` is a single-entry operational feed (kept unchanged for the Transactions screens). It cannot balance or reverse, so a separate double-entry book was added. |
| Refunds | Admin typed a "gateway refund id" and the refund was marked paid. No call to Razorpay. |
| Razorpay Route / marketplace split | **Not implemented** in the project. The treasury therefore never assumes Razorpay splits money to sellers. |

## 2. New MongoDB models
| Model | Purpose |
|---|---|
| `TreasuryAccount` | Cash, current, savings, escrow, **Razorpay Clearing** and **Gateway Fee** accounts per brand (or `PLATFORM`). Bank numbers stored masked only (last 4). No stored balance - balances derive from the journal. |
| `JournalEntry` | Immutable double-entry book in integer paise. Balanced, idempotency-keyed, source module + source reference, authenticated creator, reversal links. Update / delete blocked at model level. |
| `GatewayPayment` | Razorpay payment audit trail: payment id, Razorpay order id, internal order, brand, amount, status, refunded / pending refund amounts, settlement id, per-event audit history. |
| `GatewaySettlement` | Razorpay settlement as reported by Razorpay: net, fees (incl. tax), tax, UTR, itemised lines, destination bank, posted entry, reconciliation status and discrepancy. |
| `BankStatementEntry` | The "Unlinked Transactions" inbox: bank statement lines (evidence for reconciliation) and payouts / COD cash / POS takings awaiting a treasury account. |
| `RefundRequest` (extended) | `refundMode` (RAZORPAY / MANUAL / WALLET), `gatewayRefund` state (initiating -> initiated -> processed / failed), `FAILED` status. |
| `Counter` (existing) | Atomic journal numbers `JE-YYYY-000001`. |

## 3. Accounting
```
Capture (verified)         Dr Razorpay Clearing        Cr Customer Receipts       gross
Refund PROCESSED           Dr Customer Refunds         Cr Razorpay Clearing       refund
Settlement (verified)      Dr Bank (net)  Dr Gateway Fees (fees+tax)  Cr Razorpay Clearing (net + fees)
```
Worked example from the brief, produced by the test suite: payment 10,000, Razorpay-reported fee 200, net 9,800 -> bank +9,800, fees 200, clearing -10,000. Every value comes from the Razorpay settlement / recon data. A settlement whose items do not add up to the reported net + fees is flagged DISCREPANCY and cannot be posted.

Other postings: opening balance (Dr account / Cr Opening Equity), manual in/out, transfers, bank-statement allocation (BANK_LINK), seller / captain payout, COD cash, POS. Corrections are reversal entries; entries created from Razorpay data cannot be reversed by hand.

## 4. API (`/api/treasury`, admin + super_admin, brand scoped)
| Group | Endpoints |
|---|---|
| Dashboard | `GET /dashboard?filter=all|cash|bank|clearing` |
| Accounts | `GET/POST /accounts`, `PUT /accounts/:id`, `PATCH /accounts/:id/status`, `GET /accounts/:id/transactions` |
| Journal | `GET /journal`, `POST /journal/manual`, `POST /journal/transfer`, `POST /journal/:id/reverse` |
| Unlinked | `GET/POST /unlinked`, `POST /unlinked/import`, `POST /unlinked/:id/link`, `POST /unlinked/:id/ignore` |
| Razorpay | `GET /razorpay/payments`, `GET /razorpay/settlements[/:id]`, `POST /razorpay/settlements/sync` *(super admin)*, `POST /razorpay/settlements/:id/post` *(super admin)*, `POST .../match`, `POST .../unmatch`, `GET /razorpay/reconciliation`, `POST /razorpay/reconciliation/auto`, `POST /razorpay/refunds/:id/sync`, `POST /razorpay/backfill` *(super admin)* |
| Exports | `GET /export/transactions?format=csv|xlsx`, `GET /export/settlements?format=csv|xlsx` |

Changed existing endpoints: `PUT /api/super-admin/refunds/:id/process` (gateway refund flow), `GET /api/super-admin/refunds` (annotated with refund mode), `POST /api/payments/razorpay/webhook` (new events), `POST /api/orders/razorpay/verify-payment` (constant-time signature compare, treasury recording).

## 5. Razorpay integration details
- Order creation, payment fetch and signature verification: existing, server-side; a captured payment is booked only after the server confirms it with Razorpay (verify) or a signature-verified webhook. A frontend "success" is never trusted.
- Re-create-order guard: an existing Razorpay order for the same amount is reused (no duplicate order per attempt).
- Webhook events handled: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, **`refund.created`, `refund.processed`, `refund.failed`, `settlement.processed`**. Idempotent three ways: unique event id, atomic state guards, journal idempotency key per payment / refund / settlement.
- Refunds: for orders paid through Razorpay, "Refund via Razorpay" calls the refund API (full or partial). The request becomes COMPLETED only when Razorpay reports `processed`. Duplicate protection: atomic claim, refundable-amount check (captured - processed - pending), adoption of an already-created refund after an ambiguous 5xx / timeout, stale-lock handling. COD / wallet refunds stay manual.
- Seller wallet and commission-reversal logic is untouched.
- Gateway client (`razorpayGateway.js`) reads secrets from the environment only; `RAZORPAY_API_BASE_URL` is ignored when `NODE_ENV=production`.

## 6. Webhook configuration (Razorpay dashboard)
- URL: `https://<your-host>/api/payments/razorpay/webhook`
- Secret: the value of `RAZORPAY_WEBHOOK_SECRET`
- Active events: payment.authorized, payment.captured, payment.failed, order.paid, refund.created, refund.processed, refund.failed, settlement.processed

## 7. Settlement reconciliation
Statuses: MATCHED (amount and UTR identical), PARTIAL (same amount and date, no reference - a person confirms), DISCREPANCY (reference matches but the amount differs, or items do not add up), PENDING. Matching a bank credit posts nothing (the settlement already produced the bank credit). A credit that looks like an already-booked settlement is refused as income. Unmatched bank credits stay in the unlinked list.

## 8. Integrations
| Module | Behaviour |
|---|---|
| Customer payments | Razorpay captures -> clearing; COD refused outright. |
| Seller payouts / captain payouts | When marked PAID they are queued as separate money-out items and posted only when an admin picks the paying bank. Never mixed with seller earnings or gateway balances. |
| COD cash | Captain cash settlement approval queues a cash inflow (never Razorpay income). |
| POS | Completed cash / UPI / card sales queue an inflow (not a gateway collection). |
| Refunds | See section 5. |
| Business expenses | Manual "money out" entries (Dr Expenses). No separate expense module exists in the backend. |

## 9. Security
Role + brand enforced on the backend; other brands' objects return 404; brand and creator come from the token / scope, never the body; a brand admin naming another brand is refused; only a Super Admin can sync / post settlements, set the default settlement account or run the backfill; webhook HMAC over the raw body; secrets never returned (tested); full bank numbers never stored; CSV neutralises formula injection; overdraft protected with a per-account version bump inside a transaction.

## 10. Test results (isolated DB, single-node replica set so transactions are real; Razorpay test double, no real calls)
| Suite | Result |
|---|---|
| Treasury API - payments, webhooks, settlements, reconciliation, refunds | 97 / 97 |
| Treasury API - ledger integrity, immutability, reversals, concurrency, brand isolation, permissions, dashboard maths, exports, payout / POS separation, secrets | 76 / 76 |
| Browser end to end (real login, real UI) | 37 / 37 |
| Regression: Phase 1 security 247, refunds 32, proforma 51, challans 50, quotations 61, commissions 51, payouts 34 | all pass |
| Production frontend build | passes |

Covered brief items: 1 order creation, 2 signature, 3 captured webhook, 4 failed webhook, 5 duplicate webhook, 6 clearing balance, 7 settlement creation, 8 fee accounting, 9 bank reconciliation, 10 full refund, 11 partial refund, 12 failed refund, 13 duplicate refund, 14 COD separation, 15 payout separation, 16 concurrency, 17 double entry, 18 brand isolation, 19 permissions, 20 dashboard maths, 21 CSV / Excel.

## 11. Pending production configuration
1. MongoDB must be a replica set (Atlas is). On a standalone server the ledger still works (each entry is one atomic document, idempotent) but multi-document transactions and the overdraft guard fall back to best effort.
2. Run `node src/scripts/syncIndexes.js` once. (The treasury also creates its unique indexes on first use.)
3. Environment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (live keys in production only).
4. Create the webhook in section 6 and enable the settlement webhook / report on the Razorpay account.
5. Create the real cash and bank accounts in the page (opening balances become journal entries); mark one bank as the default settlement account.
6. Call `POST /api/treasury/razorpay/backfill` once to bring pre-existing captured payments into the book.
7. Verify in Razorpay **test mode with real test keys** (see risks): settlement and recon field shapes.
8. Restart the backend and run the frontend with a cleared Vite cache.

## 12. Known financial risks
- **Settlement payload shapes are modelled on Razorpay's documentation and a test double**, not a live account. Assumed: `settlement.fees` includes `tax`; recon items carry `entity_id`, `type`, `amount`, `fee`, `tax`, `credit`, `debit`, `settlement_id`. If real data differs the safe failure is a DISCREPANCY (nothing is posted), but verify before go-live.
- Webhook-only settlements have no per-payment detail: they post against the destination brand only and are marked non-itemised. Use "Sync from Razorpay" to itemise.
- A settlement that spans several brands is split per brand only when itemised.
- Immutability is enforced in the application layer. A person with direct database write access could bypass it - restrict database users and keep audit / backups.
- A refund over Razorpay can fail after the admin clicked; the request is shown as `Refund Failed` and can be retried, but needs a human to notice.
- The customer return flow creates a full-order refund amount; there is no UI yet to request a partial amount (the API and gateway flow support partial refunds).
- Payouts, COD cash and POS takings are not auto-assigned to a bank account (by design) and wait in the unlinked list until allocated.
- Captain-related items are attributed to a brand by city only when exactly one brand operates in that city.
- "Excel" export is SpreadsheetML (`.xls`), opened by Excel and LibreOffice without a new dependency.
- Existing Razorpay settlements from before this change are not created automatically; sync a date range (max 93 days per call).

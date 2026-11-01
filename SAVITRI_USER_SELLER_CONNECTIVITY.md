# SAVITRI - User and Seller Connectivity

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

## Seller connectivity: **66.7%** (7W / 2P / 1N / 1F / 1U of 12)
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Registration (OTP + fee payment) | 1 | 0 | 0 | 0 | 0 | 1 | 0.0% |
| Approval by Admin | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Approval visible to Super Admin | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Profile update | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Product management | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Product approval workflow | 1 | 0 | 0 | 1 | 0 | 0 | 0.0% |
| Inventory update | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Seller orders | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Seller earnings | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Commission deductions | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Payout requests | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Seller notifications | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| **TOTAL** | **12** | **7** | **2** | **1** | **1** | **1** | **66.7%** |

| Module | Evidence |
|---|---|
| Registration (OTP + fee payment) | Needs OTP SMS + Razorpay fee; not exercised (external services forbidden). |
| Approval by Admin | Verified incl. registration-fee guard. |
| Approval visible to Super Admin | Visible in /admin/sellers and SA stores. |
| Profile update | Persisted. |
| Product management | Create/update works; no ownership check, IDOR on edit/delete. |
| Product approval workflow | Enum "Pending Audit" exists; no approval endpoint found. |
| Inventory update | Persisted; visible in SA inventory. |
| Seller orders | Receive/accept works; accept lacks ownership check. |
| Seller earnings | Not credited on admin "Delivered" path; commission snapshot stored on order. |
| Commission deductions | sellerCommissionRate/Amount/Earning stored on order. |
| Payout requests | Wallet debit + Withdrawal + Payout created; validation OK. |
| Seller notifications | Order notification delivered to correct seller only. |

## User connectivity: **66.7%** (6W / 4P / 0N / 0F / 2U of 12)
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Registration / login (OTP) | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| User profile | 1 | 0 | 0 | 0 | 0 | 1 | 0.0% |
| Product listing | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Product availability / stock | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Cart | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Checkout & order creation | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Payment integration | 1 | 0 | 0 | 0 | 0 | 1 | 0.0% |
| Order tracking | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Cancellation & refund | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Reviews & ratings | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Notifications | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| End-to-end chain (order -> seller -> admin -> SA -> status -> user) | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| **TOTAL** | **12** | **6** | **4** | **0** | **0** | **2** | **66.7%** |

| Module | Evidence |
|---|---|
| Registration / login (OTP) | Mock OTP flow works in dev; no OTP brute-force lockout (security). |
| User profile | Not directly exercised. |
| Product listing | Public list OK. |
| Product availability / stock | Stock decremented on order. |
| Cart | Add/read OK; negative quantity gives 500. |
| Checkout & order creation | COD order persisted with commission snapshot; validation OK. |
| Payment integration | Razorpay create/verify with dummy keys; webhook signature verification confirmed (bad/missing signature rejected). Live payment blocked by design. |
| Order tracking | Status visible to user (but any user can read any order: security finding). |
| Cancellation & refund | Return request + SA refund processing work; chained auto-creation not verified. |
| Reviews & ratings | Delivered-only guard verified; success path not exercised. |
| Notifications | Status-change notifications created for user. |
| End-to-end chain (order -> seller -> admin -> SA -> status -> user) | Each hop verified; admin "Delivered" does not credit seller; no brand reference on order. |

## Order chain with database evidence
USER PLACES ORDER -> SELLER RECEIVES -> ADMIN MONITORS -> SUPER ADMIN VIEWS -> STATUS UPDATED -> USER NOTIFIED

| Stage | API | Database evidence | Result |
|---|---|---|---|
| Order placed (COD, qty 2 x 750) | `POST /orders` -> 201 | `orders`: orderStatus `Placed`, grandTotal 1509, sellerCommissionRate 10, sellerCommissionAmount 150, sellerEarning 1350; `products.stock` 56 -> 54 (quantity 2 deducted correctly) | PASS |
| Seller receives | `GET /orders/seller/notifications` | `sellernotifications` row for owning seller; other seller sees none | PASS |
| Seller accepts | `PUT .../accept` | accepted; **another seller could also accept the same notification (200)** | PASS / IDOR |
| Admin monitors | `GET /admin/orders` | order present | PASS (unauthenticated + unscoped) |
| Super Admin views | `GET /admin/orders` as SA | order present | PASS |
| Status update | `PUT /admin/orders/:id/status` with `orderStatus` | persisted (Packed/Delivered); payment set Paid for COD on Delivered | PASS (no state machine; any value; 500 on invalid) |
| User notified | `GET /user/notifications` | 6 notification rows after the status changes | PASS |
| Earnings | seller doc after Delivered | totalEarnings 0, wallet unchanged; 2 ledger rows created | **FAIL** |
| Return | `POST /returns` on Delivered | return created; seller and admin see it | PASS |

## Seller-specific observations
- Seller JWTs are not re-checked against seller status: a suspended or unapproved seller's token is accepted by `protect('seller')` (not separately tested; follows from `authMiddleware` code - only *users* are re-checked).
- Seller registration fee gate works: unpaid-fee sellers cannot be approved by admin and their products are not orderable ("Seller registration fee is unpaid").
- Payout request validation: over-balance, negative and missing bank details rejected; wallet debited at request time.

## User-specific observations
- OTP login uses a fixed dev OTP (`MOCK_OTP=123456`) outside production, and the `send-otp` response **returns the OTP in the body** when `NODE_ENV !== 'production'`. If the production environment variable is not set to `production`, OTP login is bypassable.
- No lockout after 8 wrong OTP attempts.
- Razorpay webhook: missing or bad signature -> 400 (HMAC SHA-256, constant-time compare). Forged `verify-payment` -> 400.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

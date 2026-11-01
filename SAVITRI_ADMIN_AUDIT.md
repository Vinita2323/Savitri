# SAVITRI - Admin Audit

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

Admin completion: **57.6%** (48 working / 3 partial / 9 pending / 20 failed / 6 untested of 86).

Admin shares controllers with Super Admin; legacy admin operations live in `routes/adminRoutes.js` (**no `protect()` on 16 of its 23 routes**), newer ones in `superAdminRoutes.js` (authenticated + brand-scoped).

## Module table
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Admin Dashboard | 3 | 1 | 0 | 0 | 2 | 0 | 33.3% |
| Seller Management | 8 | 5 | 0 | 0 | 3 | 0 | 62.5% |
| Store Management | 4 | 3 | 0 | 1 | 0 | 0 | 75.0% |
| Product Management | 5 | 2 | 0 | 0 | 3 | 0 | 40.0% |
| Category Management | 5 | 4 | 1 | 0 | 0 | 0 | 90.0% |
| Inventory Management | 2 | 1 | 0 | 1 | 0 | 0 | 50.0% |
| Order Management | 6 | 3 | 0 | 0 | 3 | 0 | 50.0% |
| Delivery Management | 5 | 3 | 0 | 0 | 0 | 2 | 60.0% |
| Commission Management | 4 | 2 | 0 | 0 | 2 | 0 | 50.0% |
| Transactions | 1 | 0 | 0 | 1 | 0 | 0 | 0.0% |
| Payouts | 3 | 2 | 1 | 0 | 0 | 0 | 83.3% |
| Refunds & Returns | 5 | 1 | 0 | 0 | 2 | 2 | 20.0% |
| Employee Management | 11 | 7 | 1 | 0 | 3 | 0 | 68.2% |
| Attendance | 6 | 5 | 0 | 0 | 0 | 1 | 83.3% |
| Task Management | 4 | 3 | 0 | 0 | 1 | 0 | 75.0% |
| Quotation Management | 5 | 2 | 0 | 2 | 0 | 1 | 40.0% |
| Reports | 2 | 1 | 0 | 1 | 0 | 0 | 50.0% |
| Notifications | 1 | 0 | 0 | 1 | 0 | 0 | 0.0% |
| Admin Profile & Permissions | 6 | 3 | 0 | 2 | 1 | 0 | 50.0% |
| **TOTAL** | **86** | **48** | **3** | **9** | **20** | **6** | **57.6%** |

## Evidence per module
| Module | Evidence |
|---|---|
| Admin Dashboard | Stats return, but route is unauthenticated and not brand-scoped. |
| Seller Management | Same controller as SA: IDOR cross-brand, unauth edit, invalid-id 500. |
| Store Management | Admin may read scoped stores/detail via /super-admin/stores. No store write API. |
| Product Management | Admin can see seller products; write routes unauthenticated/no ownership. |
| Category Management | CRUD works (admin role only; super_admin blocked). Categories are global, not brand-scoped. |
| Inventory Management | Read via scoped inventory endpoint; stock adjustment is SA-only by design. |
| Order Management | Monitor/status/notifications OK. Unauthenticated + unscoped + no state machine + 500 on invalid status. |
| Delivery Management | Captain list, challan list OK; assignment/creation success paths not exercised. |
| Commission Management | Read/reports OK. Global write by any admin; seller commission changes not brand-checked. |
| Transactions | Admin intentionally blocked from /transactions (SA only). No admin-level ledger view. |
| Payouts | List scoped; cross-brand approve blocked (403). Admin can approve payouts (policy decision). |
| Refunds & Returns | Admin returns list/approve work but unscoped (cross-brand IDOR). Admin refund processing not separately exercised. |
| Employee Management | Same as SA row. |
| Attendance | Same as SA row. |
| Task Management | Same as SA row. |
| Quotation Management | Proforma/challan list + validation OK. No persisted quotation entity. |
| Reports | Commission reports OK. Financial reports are SA-only. |
| Notifications | No admin notification API. |
| Admin Profile & Permissions | Profile get/update OK; self role/brand escalation blocked. No permission/module model; 4-char password accepted. |

## Static / mock / hard-coded data found
- Backend: demo employees, tasks and leave requests auto-inserted by `employeeController` when the collections are small; four baseline brands inserted by `scopeMiddleware`; hard-coded fallback JWT secret; hard-coded default `brandId: 'brand_fg'` when an employee is created without a brand (`brandId || 'brand_fg'`).
- Frontend admin panel: `modules/admin/mock/adminMockData.js` (mock stats, users, sellers, warehouses, orders, payments, roles, FAQs) is still imported by `AdminSubPages.jsx`; `mywillbook-super-admin` and `brand-super-admin` panels use only mock state.

## What was verified for Admin
| Check | Result |
|---|---|
| APIs connected to MongoDB | PASS for tested modules |
| CRUD + persistence (sellers status, categories, employees, tasks, attendance) | PASS |
| Search / filter / pagination accepted | PASS (smoke) |
| Status changes persist | PASS (seller, order, task, payout, refund) |
| Validation | PARTIAL - many 4xx paths OK; invalid ObjectId, negative cart quantity and invalid order status give HTTP 500 |
| Unauthorised operations blocked | **FAIL** on the legacy `/admin/*` surface (no JWT needed) and across brands; PASS on SA-only routes |
| Admin cannot change own role/brands | PASS (`PUT /admin/profile` ignores role/authorizedBrands) |
| Brand-restricted admin limited to own brand | PASS on `/super-admin/*`, `/employees` list, challans; **FAIL** elsewhere |

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

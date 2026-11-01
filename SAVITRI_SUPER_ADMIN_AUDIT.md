# SAVITRI - Super Admin Audit

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

Super Admin completion: **65.0%** (80 working / 5 partial / 14 pending / 23 failed / 5 untested of 127).

Super Admin is an `Admin` document with `role: 'super_admin'`. It signs in at `POST /api/auth/super-admin/login` (also accepted by the admin login endpoint) and is authorised for every brand and for consolidated ALL scope. The Super Admin API surface is concentrated in `routes/superAdminRoutes.js` (financial dashboards, payouts, refunds, commissions, stores, inventory, delivery partners, reports, audit logs), `routes/brandRoutes.js`, `routes/walletRoutes.js` (withdrawals) and the shared `/employees` module.

## Module table
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Authentication | 7 | 4 | 1 | 0 | 2 | 0 | 64.3% |
| Admin Management | 6 | 0 | 0 | 6 | 0 | 0 | 0.0% |
| Brand Management (create/read/update/delete/status) | 8 | 7 | 0 | 0 | 1 | 0 | 87.5% |
| Brand Selection & Brand-wise Data Access | 6 | 4 | 0 | 0 | 2 | 0 | 66.7% |
| Seller Management | 8 | 5 | 0 | 0 | 3 | 0 | 62.5% |
| Store Management | 5 | 4 | 0 | 1 | 0 | 0 | 80.0% |
| Product Management | 5 | 1 | 0 | 1 | 3 | 0 | 20.0% |
| Inventory Management | 6 | 6 | 0 | 0 | 0 | 0 | 100.0% |
| Order Management | 5 | 2 | 0 | 0 | 3 | 0 | 40.0% |
| Delivery Management | 5 | 3 | 0 | 0 | 0 | 2 | 60.0% |
| Transactions (ledger) | 4 | 3 | 0 | 0 | 1 | 0 | 75.0% |
| Commission Management | 7 | 6 | 0 | 0 | 1 | 0 | 85.7% |
| Payout Management | 7 | 5 | 1 | 0 | 1 | 0 | 78.6% |
| Refund Management | 6 | 5 | 0 | 0 | 0 | 1 | 83.3% |
| Employee Management | 11 | 7 | 1 | 0 | 3 | 0 | 68.2% |
| Attendance Management | 6 | 5 | 0 | 0 | 0 | 1 | 83.3% |
| Task Management | 4 | 3 | 0 | 0 | 1 | 0 | 75.0% |
| Quotation Management | 5 | 0 | 0 | 3 | 1 | 1 | 0.0% |
| Reports & Analytics | 6 | 5 | 1 | 0 | 0 | 0 | 91.7% |
| Global Settings | 5 | 4 | 0 | 0 | 1 | 0 | 80.0% |
| Audit Logs | 3 | 1 | 1 | 1 | 0 | 0 | 50.0% |
| Notifications (SA/Admin) | 2 | 0 | 0 | 2 | 0 | 0 | 0.0% |
| **TOTAL** | **127** | **80** | **5** | **14** | **23** | **5** | **65.0%** |

## Evidence per module
| Module | Evidence |
|---|---|
| Authentication | Login/me/JWT/role split verified. 4-char passwords accepted (partial). No login rate limit; deleted admin token still valid (failed). |
| Admin Management | No create/list/update/permission/deactivate/delete admin API exists. Admins only exist via DB/scripts. |
| Brand Management (create/read/update/delete/status) | Full CRUD + duplicate-code + validation + persistence verified. Brand list returns all brands to a brand-restricted admin (failed). |
| Brand Selection & Brand-wise Data Access | Scope middleware works on /super-admin/*, /employees, challans. Fail-open default for unrestricted admins; /admin/* legacy routes ignore brand scope. |
| Seller Management | List/approve/status persist OK. Invalid ObjectId returns 500; cross-brand mutation allowed; unauthenticated edit allowed. |
| Store Management | SA stores list/detail/brand filter OK (stores = sellers). No store create/edit API. |
| Product Management | Read OK. Write routes have no auth/ownership; empty body creates placeholder product; negative values give 500. No SA approval workflow. |
| Inventory Management | Brand-scoped view, isolation, ADD persists, over-deduct blocked, bad adjustType rejected, admin blocked. |
| Order Management | View + status persist OK. No brand reference on Order; no state machine; invalid status gives 500. |
| Delivery Management | Scoped delivery-partner list, captain list, challan list OK. Challan/proforma success-path creation and captain assignment not exercised. |
| Transactions (ledger) | Ledger list/brand filter/post-delivery rows OK. Seller earnings not credited on admin "Delivered" path (failed). |
| Commission Management | Update/persist/validation/list/brand filter OK. Plain admin can also change commission via /admin route (authority bypass). |
| Payout Management | List, brand isolation, approve/process (mock UTR), idempotency, reject-after-paid blocked. WithdrawalRequest stays PENDING after PayoutRequest PAID. |
| Refund Management | List, approve, complete (no gateway call), immutability, 404. Auto-creation of refund from return flow not exercised end-to-end. |
| Employee Management | CRUD/validation/duplicate/pagination/search OK, forged brandId neutralised. Read/update/status by id lack brand check. Demo employees auto-seeded into DB on GET. |
| Attendance Management | Check-in/out, duplicate guard, brand stored, SA read, brand-filtered list OK. Correction workflow not exercised. |
| Task Management | Create/persist brand/status OK. Status change by id lacks brand check. |
| Quotation Management | No Quotation model/list/status API (email-only endpoint). Super admin is 403 on it (role string "super-admin"). SMTP send blocked (no real email permitted). |
| Reports & Analytics | 4 report types (reportType param) + authz OK. Admin dashboard stats are not brand-scoped. |
| Global Settings | Commission/pricing/policy reads OK. Any admin (even brand-restricted) can write global commission settings. |
| Audit Logs | Financial audit log works. Does not cover admin/permission/brand/HR actions; no admin-activity log. |
| Notifications (SA/Admin) | No super-admin or admin notification API. (User/seller/captain notifications exist.) |

## Per-operation matrix (what was actually exercised)

| Module | Create | Read | Update | Delete | Persisted in DB | Validation | AuthN/AuthZ | Brand filter | Errors |
|---|---|---|---|---|---|---|---|---|---|
| Brands | PASS | PASS | PASS | PASS | PASS | PASS (name, code, duplicate) | PASS (SA-only writes) | n/a | PASS |
| Sellers (via /admin/sellers) | n/a (self-register) | PASS | PASS (status, details, commission) | not tested (destructive) | PASS | PARTIAL (500 on bad id) | FAIL (routes unauthenticated) | FAIL (legacy) | PARTIAL |
| Stores | n/a | PASS | n/a | n/a | n/a | n/a | PASS | PASS | PASS |
| Inventory | n/a | PASS | PASS (ADD/DEDUCT) | n/a | PASS | PASS | PASS | PASS | PASS |
| Orders | n/a | PASS | PASS | n/a | PASS | FAIL (500 on bad status, no state machine) | FAIL (unauth) | FAIL | PARTIAL |
| Commission | n/a | PASS | PASS | n/a | PASS | PASS (0-100) | PASS (SA route) / FAIL (admin bypass) | PASS | PASS |
| Payouts | created by seller | PASS | PASS (approve/process/reject) | n/a | PASS | PASS (UTR required, idempotent) | PASS | PASS | PASS |
| Refunds | auto from returns (not e2e) | PASS | PASS | n/a | PASS | PASS | PASS | not conclusive | PASS |
| Employees | PASS | PASS | PASS | n/a (deactivate only) | PASS | PASS | PASS (list) / FAIL (by id) | PASS (list) / FAIL (by id) | PARTIAL |
| Attendance | PASS | PASS | not tested (corrections) | n/a | PASS | PASS (duplicate) | PASS | PASS | PASS |
| Tasks | PASS | PASS | PASS | n/a | PASS | PASS | PASS | FAIL (by id) | PASS |
| Audit logs | system-generated | PASS | n/a | n/a | PASS | n/a | PASS | ALL only | PASS |
| Admin management | NOT IMPLEMENTED | | | | | | | | |
| Notifications | NOT IMPLEMENTED | | | | | | | | |
| Quotations | NOT IMPLEMENTED (e-mail endpoint only) | | | | | | | | |

## Super Admin-specific defects
- **Role string mismatch:** `routes/quotationRoutes.js` uses `protect('admin','super-admin')`; the token role is `super_admin`, so Super Admin receives 403. `categoryRoutes`, `bannerRoutes`, `returnRoutes` (admin section) and several `membershipRoutes` admin routes use `protect('admin')` only and also exclude Super Admin (category create and returns list verified 403).
- **Authority bypass:** the Super Admin-only commission route (`PUT /super-admin/sellers/:id/commission`) is duplicated by `PUT /admin/sellers/:id/commission`, which any admin can call; `PUT /admin/commission-settings` is writable by every admin, including brand-restricted ones.
- **Brand list leak:** `GET /super-admin/brands` is not filtered by `authorizedBrands` (restricted admin saw all 4 brands).
- **Audit coverage:** only financial actions write `FinancialAuditLog` (9 rows by the end of the run: commission update, payout approve/reject/process, inventory adjustments, refund processing). Brand changes, HR actions, seller approval and admin actions are not audited.
- **Seed/demo data in production paths:** `employeeController` auto-creates demo employees/tasks/leaves in MongoDB on first read (`DEFAULT_SEED_EMPLOYEES`); `ensureBaselineBrands` runs on every scoped request and re-seeds four brands if the collection is empty.
- **Frontend:** the real `/super-admin` panel calls the API via `services/superAdminService.js`. The separate `/mywillbook-super-admin` and `/brand-super-admin` panels (Admin Management, Staff Roles, Security Settings, Audit Logs, Payout Overview, ...) are **frontend-only mock UIs** with no backend counterpart.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

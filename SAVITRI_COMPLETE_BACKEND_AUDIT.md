# SAVITRI - Complete Backend Audit

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

> **Naming note.** The repository, package name, JWT fallback secret, health message and several comments still say "Shippnex"; the product is branded Savitri. A stale `backend_audit_and_completion_reportshippnex` file exists at the repo root and was **not** relied on.

## 1. Executive summary

| Question | Answer |
|---|---|
| Overall verified backend completion | **60.4%** pooled across all six feature tables (166 working, 23 partial, 32 pending, 59 failed, 14 untested/blocked of 294 features) |
| Super Admin | **65.0%** |
| Admin | **57.6%** |
| Admin <-> Super Admin connectivity | **52.6%** |
| Brand management & isolation | **50.0%** |
| Seller connectivity | **66.7%** |
| User connectivity | **66.7%** |
| API test pass rate | **77.8%** (203 of 261 conclusive tests); security-relevant subset (authN/authZ/brand) **63.5%** (66 of 104) |
| Security assessment | **Not acceptable for production** - see Security Audit (3 CRITICAL and 8 HIGH distinct defects) |
| Production readiness | **Not ready** - 1 of 10 release gates met (see section 6) |

Pooled percentages double-count features that Admin and Super Admin share (they use the same controllers); the per-table figures are more meaningful than the pooled one.

**Bottom line.** The business workflows themselves (brand CRUD, scoped finance views, commission, payout processing, inventory adjustment, employees/attendance/tasks, user -> seller -> admin -> super admin order chain) largely work and persist correctly in MongoDB. What is missing or broken is the *governance layer* the audit brief cares most about: there is no Admin-management/permission system at all, many admin endpoints have no authentication, and brand isolation is only enforced on the newer routes.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

## 2. Architecture discovered (Phase 1)

| Area | Finding |
|---|---|
| Stack | Backend: Node 20, Express 5.2, Mongoose 9.9, Socket.IO 4.8, JWT (`jsonwebtoken`), `bcryptjs`, Razorpay, Cloudinary, Firebase Admin (FCM), Nodemailer, India-Hub SMS. Frontend: React 18 + Vite 5, react-router 7, axios, socket.io-client, Firebase. |
| Entry points | `Backend/src/server.js` (HTTP + Socket.IO; `Backend/api.js` is a pre-start script). `npm start` runs `node api.js && node src/server.js`. |
| Routes | 44 route files, 368 route handlers (static parse; each mounted twice, under `/api` and at root). |
| Controllers / Models | 40 controllers, 57 Mongoose models (all with timestamps). |
| Middleware | `authMiddleware.protect(...roles)` (JWT from Bearer or cookie; role string check; blocks suspended *users*), `scopeMiddleware.resolveBrandScope` (X-Brand-Id / ?brandId / body.brandId), `simpleRateLimit` (used on one route), error + timing middleware. |
| Auth model | Roles: `user`, `seller`, `captain`, `admin`, `super_admin`. Admin and Super Admin share one collection (`Admin.role`). Cookies: `shippnex_admin_token` / `shippnex_super_admin_token` (HttpOnly) plus Bearer token. Sessions 8 h / 30 d. |
| Brand model | `Brand` (brandId slug, code, city, geo, radius). Four baseline brands (Indore, Bhopal, Jabalpur, Ujjain) auto-seeded when the collection is empty. `Seller.brandId/brand`; HR collections (Employee, Attendance, EmployeeTask, Leave, Holiday, Shift) carry `brandId`; most commerce and finance documents do not. |
| Realtime | Socket.IO accepts only role `user` and joins `user:<id>` rooms for notifications. No admin/seller socket events. |
| Payments | Razorpay order/verify endpoints and an HMAC-verified webhook (`/api/payments/razorpay/webhook`, raw body, constant-time compare). |
| Frontend panels | `user`, `seller`, `delivery`, `admin`, `super-admin` call the backend through `services/*.js`. `brand-super-admin` and `mywillbook-super-admin` import **no API code** - they run on mock data held in React state (admin management, roles, security settings, audit logs, payouts, etc.). `admin/mock/adminMockData.js` is still imported by `AdminSubPages.jsx`. |
| Existing tests | `Backend/tests` has 20 unit tests for brand eligibility/scope helpers; all pass (`node --test tests/`). No API or integration tests. |

## 3. Module completion (pooled)

### 3.1 Super Admin
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

### 3.2 Admin
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

### 3.3 Admin <-> Super Admin connectivity
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. Admin creation by SA | 7 | 2 | 1 | 4 | 0 | 0 | 35.7% |
| B. Admin updates by SA | 5 | 0 | 1 | 3 | 1 | 0 | 10.0% |
| C. Brand connectivity | 8 | 5 | 1 | 0 | 2 | 0 | 68.8% |
| D. Data synchronisation | 11 | 9 | 1 | 1 | 0 | 0 | 86.4% |
| E. Permission tests | 7 | 2 | 0 | 0 | 5 | 0 | 28.6% |
| **TOTAL** | **38** | **18** | **4** | **8** | **8** | **0** | **52.6%** |

### 3.4 Brand management and isolation
| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brand reference on documents | 7 | 2 | 1 | 0 | 4 | 0 | 35.7% |
| Admin mapped to authorised brands | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| SA global view | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Brand switching loads correct data | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Sellers belong to correct brand | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Products & inventory scoped | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Orders associated with brand | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Transactions/commissions association | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Reports use brand filters | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Cross-brand prevention (restricted users) | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Backend validates brandId (not trusting UI) | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| No multi-brand data without authz | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Hard-coded/seeded brand data | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| **TOTAL** | **19** | **7** | **5** | **0** | **7** | **0** | **50.0%** |

### 3.5 Seller connectivity
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

### 3.6 User connectivity
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

### 3.7 Verified status legend
- **Implemented and tested:** "Working" above. **Implemented, not tested / blocked:** "Untested / Blocked". **Partially implemented:** "Partial". **Not implemented:** "Pending". **Failed:** implemented but a verified defect.

## 4. Final summary answers

1. **How much of the Savitri backend is completed?** 60.4% verified (pooled). Super Admin 65.0%, Admin 57.6%.
2. **How much is pending?** 32 features not implemented (10.9% of features), 59 implemented-but-failing (20.1%), 23 partial, 14 blocked/untested.
3. **Is Super Admin fully functional?** No. Financial/brand/inventory/HR views work, but Admin Management, Notifications, Quotation management and a general settings module are absent, and Super Admin is 403 on quotations, categories, banners and returns.
4. **Is Admin fully functional?** No. Day-to-day modules work, but many admin endpoints are unauthenticated, not brand-scoped, and there is no per-admin permission model.
5. **Are Admin and Super Admin properly connected?** Data flows correctly *to* Super Admin (stores, inventory, payouts, commissions, refunds, HR), but the control path *from* Super Admin to Admin (create, assign brand, permissions, deactivate) does not exist (52.6%).
6. **Is brand-wise data isolation working?** Partially. It is enforced and validated server-side on `/super-admin/*`, `/employees`, challans and proforma invoices, but not on `/admin/*`, `/returns/admin/*`, by-id HR endpoints, order/seller mutations, products, or the brand list.
7. **Can Super Admin control Admin permissions correctly?** No. Only `authorizedBrands` exists and it can only be set directly in MongoDB; unrestricted is the default.
8. **Are changes synchronised across panels?** Mostly yes for reads (single database). Gaps: payout/withdrawal status, seller earnings on admin delivery, quotations (no entity).
9. **Which APIs are broken?** See API Test Results. Highlights: unauthenticated admin/product/FAQ/vehicle/support routes; `GET /orders/:id`; seller-notification accept; admin order/seller/return mutations across brands; `PUT /admin/sellers/:id/status` and `POST /cart/add` on bad input (500); `/quotations/send-email`, `/categories`, `/returns/admin/all` for Super Admin (403).
10. **Which modules are incomplete?** Admin Management, Admin/SA Notifications, Quotation management, SA product approval, store write APIs, general settings, admin audit trail, per-admin permissions.
11. **Ten most critical issues:**

1. **Unauthenticated admin API surface.** `/api/admin/*` (dashboard, users, sellers, captains, orders and their PUT/DELETE operations), `/api/sellers/:id` DELETE, `/api/transport/vehicles` (POST/PUT/DELETE), `/api/faqs` (POST/PUT/DELETE, `GET /admin`) and `PUT /api/support-settings` have no `protect()`. Verified live: no-token requests returned 200/201 and a seller's details were edited anonymously. **CRITICAL**
2. **Unauthenticated product writes.** `POST/PUT/DELETE /api/products` need no JWT and perform no ownership check: anonymous users create products; any seller can rename, re-price or delete another seller's product (verified). **CRITICAL**
3. **No Admin management or permission system.** There is no API to create, list, edit, deactivate or delete an Admin, assign brands, or assign module permissions; `Admin` has no status/permissions fields. The "Super Admin controls Admin permissions" requirement does not exist in the backend. The only admin-management UI is a frontend-only mock panel (`mywillbook-super-admin`). **CRITICAL (missing core feature)**
4. **Revoked/deleted admins stay authorised.** `protect()` only verifies the JWT signature and role; it never reloads the admin. A deleted admin's token still returned 200 on `/super-admin/payouts`. Sessions last 8 h (30 d with "remember me"). **HIGH**
5. **Cross-brand access on legacy routes.** Brand scope is enforced on `/super-admin/*`, `/employees`, challans and proforma lists, but not on `/admin/*`, `/returns/admin/*`, or by-id employee/task endpoints. A brand-restricted admin could suspend another brand's seller, change its commission, cancel its order, approve its return, edit its employee and complete its task (all verified). **HIGH**
6. **Order IDOR.** `GET /api/orders/:id` has no ownership check - any logged-in user can read any order, including `deliveryOtp` (verified). `PUT /orders/seller/notifications/:id/accept` has no seller-ownership check (verified). **HIGH**
7. **Fail-open brand authorisation.** An admin with no `authorizedBrands` (or an empty list) is authorised for every brand and for consolidated ALL scope; the model default is `undefined`. `GET /super-admin/brands` lists every brand to a restricted admin. **HIGH**
8. **Weak platform hardening.** Hard-coded JWT fallback secret (`'shippnex_secret'`) in three places; CORS reflects any origin with credentials; no helmet, no body sanitising, 50 MB JSON limit; no rate limiting on any login/OTP endpoint (only on one public brand route); 4-character passwords accepted; stack traces returned in error bodies; NoSQL-operator login payload gives 500. **HIGH/MEDIUM**
9. **Financial synchronisation gaps.** Marking an order Delivered through the admin route does not credit the seller (totalEarnings/wallet unchanged); `WithdrawalRequest` stays PENDING after its `PayoutRequest` is PAID; admin routes let a plain admin set seller commission, global commission settings and approve payouts, bypassing the "Super Admin authority" routes; `Order`, `PayoutRequest`, `PlatformLedger`, `RefundRequest` carry no brand reference. **HIGH/MEDIUM**
10. **Role-string mismatches lock Super Admin out of features.** `/quotations/send-email` allows `'super-admin'` (hyphen) while tokens carry `super_admin` -> 403 for Super Admin; categories, banners, returns and membership admin routes are `protect('admin')` only -> 403 for Super Admin (verified for send-email, categories, returns). Also no order state machine and invalid values surface as HTTP 500. **MEDIUM**

12. **Next development phase.** See `SAVITRI_PENDING_FEATURES.md` - Phase 0 security hardening first (authentication on every admin route, ownership checks, central brand scope, admin lifecycle in `protect`), then the Admin Management + permission module, then brand-reference migration for Order/Payout/Ledger/Refund, then financial-sync fixes and integration tests.

## 5. Blocked / not tested (stated explicitly)

- Seller registration (OTP SMS + Razorpay registration fee), captain app flows, POS billing, challan/proforma *successful* creation, quotation e-mail sending, Cloudinary uploads, FCM push, Socket.IO event delivery, live Razorpay: external services were not to be triggered.
- Database-failure injection and concurrency/race testing (e.g. double payout, double stock deduction) were not performed.
- Pagination/search were smoke-tested (accepted and returned data) but result correctness across large datasets was not verified.
- Frontend behaviour was surveyed statically only (which panels call the API vs. mock data); no browser testing.

## 6. Production-readiness gates

| Gate | Status |
|---|---|
| Every admin endpoint authenticated and role-checked | FAIL |
| Admin lifecycle (create/disable/revoke) enforced per request | FAIL |
| Brand isolation enforced centrally and fail-closed | FAIL |
| No IDOR on orders/products/HR/returns | FAIL |
| JWT secret mandatory (no fallback), CORS allow-list, helmet | FAIL |
| Rate limiting / lockout on login and OTP | FAIL |
| Financial records consistent (earnings, withdrawals, ledger) | PARTIAL |
| Automated API/integration tests in CI | FAIL (20 unit tests only) |
| No stack traces / internals in responses | FAIL |
| Payment webhook signature verification | PASS |

**1 of 10 gates met.**

## 7. Source integrity

After the audit, `git status` shows only the ten new `SAVITRI_*` report files (untracked); no tracked file was modified. `.env` was inspected only with values redacted. Because `dotenv` does not override variables already set in the process, the server still loaded 8 variables from `.env` that the harness did not override (the log reports "injected env (8)"); all credential-bearing variables for Mongo, JWT, Razorpay, Cloudinary, SMS (API key blank, mode mock), Firebase and SMTP were overridden, and no outbound send was observed. The test server and in-memory database were shut down afterwards.

## 8. Report index

`SAVITRI_SUPER_ADMIN_AUDIT.md`, `SAVITRI_ADMIN_AUDIT.md`, `SAVITRI_ADMIN_SUPER_ADMIN_CONNECTIVITY.md`, `SAVITRI_BRAND_ISOLATION_AUDIT.md`, `SAVITRI_USER_SELLER_CONNECTIVITY.md`, `SAVITRI_API_TEST_RESULTS.md`, `SAVITRI_SECURITY_AUDIT.md`, `SAVITRI_PENDING_FEATURES.md`, `SAVITRI_MODULE_COMPLETION.csv`.

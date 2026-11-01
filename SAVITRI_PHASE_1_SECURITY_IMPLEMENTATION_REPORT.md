# SAVITRI - Phase 1 Security Implementation Report

_Date: 2026-11-01 | Scope: `Backend/src` | Basis: `SAVITRI_SECURITY_AUDIT.md` and `SAVITRI_COMPLETE_BACKEND_AUDIT.md`_

## 0. Result at a glance

| Item | Result |
|---|---|
| Phase 1 tasks 1-6 (code) | Implemented; each fix verified by at least one test |
| Phase 1 security + regression suite | **249 of 250 pass**. The single failing check is informational (stack traces in error bodies, which is explicitly outside Phase 1) |
| Existing unit tests (`npm test`) | 20 / 20 pass |
| Same suite run against the **original** code | Detects the original flaws: 92 failures in the 172 checks recorded before the attacks destroyed the test fixtures (section 8.3) |
| Database used | Throw-away in-memory MongoDB (`savitri_phase1_test`). The Atlas URI in `.env` was never used. All third-party credentials were dummies |
| Production data / `.env` | Not touched. No secret values were printed |
| Fully closed? | **No.** Section 10 lists what remains, including items that cannot be fixed safely without your input (most importantly the brand-assignment default, section 5.3) |

---

## 1. Security issues addressed

| # | Issue (from the audit) | Severity | Status |
|---|---|---|---|
| C1 | `/api/admin/*` unauthenticated (16 of 23 routes) | Critical | **Fixed** |
| C2 | Unauthenticated writes: `/products`, `/faqs`, `/support-settings`, `/transport/vehicles`, `DELETE /sellers/:id` | Critical | **Fixed** (`/upload` deliberately left public, rate-limited; see 10) |
| C3 | Deleted/inactive/revoked admin tokens still accepted | Critical | **Fixed** |
| H1 | Cross-brand access on `/admin/*`, `/returns/admin/*`, by-id employee/task/leave/attendance | High | **Fixed** (see 10 for modules not covered) |
| H2 | `GET /orders/:id` readable by any user (incl. delivery OTP); seller-notification actions on others' orders | High | **Fixed** |
| H3 | Product update/delete without ownership | High | **Fixed** |
| H4 | Brand list not filtered; unrestricted admins fail-open | High | **Partly fixed** (list filtered; fail-open default kept behind a flag, see 5.3) |
| H5 | Hard-coded JWT fallback secret | High | **Fixed** |
| H7 | Plain admin could change seller commission and global commission settings | High | **Fixed** (Super Admin only) |
| M6 | Super Admin locked out by role-string mismatches | Medium | **Fixed** |
| M3 (part) | Operator-injection login payload gave HTTP 500 | Medium | **Fixed** (400) |
| M8 (part) | Invalid `orderStatus` gave HTTP 500 | Medium | **Fixed** (400) |

Not part of Phase 1 and **not** fixed: H6 (rate limiting/OTP lockout, OTP in response), H8 (CORS), M1, M2, M4, M7, remaining M8 cases. See section 10.

---

## 2. Files modified

**New (2)**
- `Backend/src/utils/jwtConfig.js` - single source of the JWT secret; no fallback; startup assertion.
- `Backend/src/utils/accessControl.js` - ownership helpers: `canAccessSellerId`, `canAccessProduct`, `canAccessReturn`, `scopeUnlessSeller`.

**Modified (29)**

| Area | Files |
|---|---|
| Auth / JWT | `middleware/authMiddleware.js`, `utils/generateToken.js`, `socket/socket.js`, `server.js`, `controllers/adminAuthController.js`, `controllers/superAdminAuthController.js`, `models/Admin.model.js` |
| Brand scope | `middleware/scopeMiddleware.js`, `controllers/brandController.js` |
| Admin surface | `routes/adminRoutes.js`, `controllers/adminController.js` |
| IDOR | `controllers/orderController.js`, `controllers/productController.js`, `routes/productRoutes.js`, `controllers/returnController.js`, `routes/returnRoutes.js`, `controllers/employeeController.js` |
| Route protection | `routes/vehicleTypeRoutes.js`, `routes/faqRoutes.js`, `routes/supportRoutes.js`, `routes/sellerRoutes.js`, `routes/uploadRoutes.js`, `routes/commissionRoutes.js` |
| Role string fixes | `routes/bannerRoutes.js`, `routes/categoryRoutes.js`, `routes/membershipRoutes.js`, `routes/policyRoutes.js`, `routes/referralRoutes.js`, `routes/sellerRegistrationFeeRoutes.js` |

No route was deleted. No API path or response shape was changed except where listed in section 9.

---

## 3. Middleware changes

### 3.1 `protect(...roles)` (`authMiddleware.js`)
- Verifies the token with `getJwtSecret()` and an explicit `HS256` allow-list (rejects `alg=none`, other algorithms and wrong secrets).
- **Role names are normalised** (`super-admin`, `Super_Admin` -> `super_admin`) for both token and route, so declarations can no longer drift.
- **Admin / Super Admin accounts are reloaded from MongoDB on every request:**
  - missing account -> **401**;
  - `status` other than `active` -> **403** (documents without the field count as active, so no migration is needed);
  - DB role differs from the token's role (demotion/forged claim) -> **401**;
  - `tokenVersion` differs from the token's -> **401** (session revoked).
- `req.user.role` and `req.user.authorizedBrands` now come from the database, not the token, so role/brand/status changes apply on the next request.
- Role check runs after account validation: 401 = not authenticated / session invalid, 403 = authenticated but not permitted.
- Behaviour for users, sellers and captains is unchanged (user suspension check kept).

### 3.2 Admin model and login
- `Admin.status` (`active` | `inactive` | `suspended`, default `active`) and `Admin.tokenVersion` (default 0).
- Admin and Super Admin login: reject inactive/suspended accounts (403), reject non-string `email`/`password` (400), and put `tokenVersion` into the token.
- Changing a password via `PUT /admin/profile` increments `tokenVersion` (old tokens die) and returns a fresh token, so the current session continues.
- `PUT /admin/profile` still ignores `role`, `authorizedBrands`, `status` and `tokenVersion` (verified).

### 3.3 `resolveBrandScope` / helpers (`scopeMiddleware.js`)
- A brand-restricted admin with **exactly one** assigned brand who names no brand is pinned to that brand (instead of a hard 403); with several brands the brand must be explicit.
- `isBrandAuthorizedForUser` normalises roles; new `canAccessAllBrands`.
- New: `getScopedOrderIds`, `orderScopeFilter`, `orderInScope` (orders belong to a brand through the seller they were routed to), `captainScopeFilter`, `captainInScope` (city-based), `getScopedUserIds` (customers who ordered from the brand).
- New env flag `ADMIN_BRANDS_FAIL_CLOSED=true` (see 5.3).

### 3.4 `scopeUnlessSeller` (`accessControl.js`)
Resolves brand scope only for `admin` / `super_admin`; sellers, users and captains pass through untouched.

---

## 4. Routes protected

### 4.1 Newly authenticated (previously open)
| Route(s) | Now requires |
|---|---|
| `/api/admin/dashboard`, `/users`, `/users/:userId/orders`, `/sellers*`, `/captains*`, `/orders*`, `/captain-cash-settlements*` (all methods) | active admin / super admin + validated brand scope |
| `DELETE /api/sellers/:id` | admin / super admin + brand scope |
| `GET /transport/vehicles/admin/all`, `POST/PUT/DELETE /transport/vehicles` | admin / super admin |
| `GET /faqs/admin`, `POST/PUT/DELETE /faqs` | admin / super admin |
| `PUT /support-settings` (and `/support`) | admin / super admin |
| `POST/PUT/DELETE /products` | seller (own products), admin / super admin (brand-scoped) |

### 4.2 Super Admin only (privileged financial / global settings)
`PUT /admin/commission-settings`, `PUT /admin/sellers/:id/commission`. Already Super Admin only and verified: ledger, commissions, reports, audit logs, settlements, financial adjustments, inventory adjustment, brand create/update/delete/status, `/wallet/admin/*` withdrawals.

### 4.3 Super Admin now accepted where only `admin` was listed
Categories, banners, membership plans, policies, referral admin, seller/captain registration-fee admin, returns admin, quotation e-mail. Previously Super Admin received 403 on these.

### 4.4 Intentionally still public
`GET /products`, `/categories`, `/banners`, `/faqs`, `/support-settings`, `/transport/vehicles`, `/pricing/active`, `/commission-settings/current`, `/policies`, `/health`, auth/login/OTP endpoints, Razorpay webhook (signature-verified), and `/upload` + `/upload/base64` (needed before login by seller/captain registration; now limited to 60 requests/min/IP).

---

## 5. Brand authorization changes

1. **Legacy admin routes are scoped.** `/admin/*` now runs `resolveBrandScope`: invalid brand -> 400, unauthorised brand or `ALL` for a restricted admin -> 403.
2. **Listings are filtered** by the validated scope: sellers (per-scope cache - the old single global cache would have leaked across brands), captains, orders, customers, dashboard statistics, captain cash settlements (list and summaries), returns list.
3. **By-id operations answer 404** outside scope (no existence disclosure): seller status/details/delete, captain status/details/delete/assign, order status/assign-captain/return-status, settlement processing, returns approve/verify/assign/receive/read, employee read/update/status, attendance check-in/out/correction, task status/comments, leave submit/review.
4. **Not trusting client `brandId`:** the header/query/body value is only a selector; it is validated against the admin's DB-stored `authorizedBrands`. On `/employees`, a forged `body.brandId` is overwritten with the validated brand (verified).
5. **Brand list:** `GET /super-admin/brands` returns only assigned brands to restricted admins; `GET /super-admin/brands/:id` -> 404 for others.
6. **Customer blocking** is platform-wide, so it now requires all-brand authorization.
7. **Fail-open default (see 10.1).** An admin with no/empty `authorizedBrands` remains "all brands" by default because every existing admin document is in that state and there is no API yet to assign brands; setting `ADMIN_BRANDS_FAIL_CLOSED=true` turns it into "no brands" (unit-verified). Switch it on only after brands are assigned.

Super Admin keeps authorised global access (`ALL`).

---

## 6. IDOR fixes

| Resource | Fix | Verified |
|---|---|---|
| Order (`GET /orders/:id`) | Only the owning customer; others get 404 (also by public `orderId`) | Yes |
| Seller notification view/accept/reject/status | Lookup constrained to `sellerId = caller`; others 404 | Yes (4 actions) |
| Product create | Seller's `sellerId`/`seller` forced to the caller; admin must have access to the named seller | Yes |
| Product update/delete | Owner seller, or admin whose scope contains the seller; `sellerId` not reassignable by sellers | Yes |
| Seller records (status/details/commission/delete) | `sellerInScope`; commission Super Admin only | Yes |
| Captain records | `captainInScope` (city) | Code + build; city scoping not live-tested |
| Order admin actions | `orderInScope` | Yes (cancel, assign-captain, return-status) |
| Returns | `canAccessReturn` (seller owner or scoped admin); list filtered | Yes |
| Employee / attendance / task / leave by id | `inBrand` check | Yes (read, update, status, check-in, task status, task comment) |
| Payout / refund / transaction | Already scope-checked by the Super Admin finance controllers; cross-brand approve returned 403 | Payout approve verified; **detail/transaction by-id not re-tested** |
| Brand | `getBrandById` authorization | Yes |

---

## 7. JWT security changes

- Removed all three `|| 'shippnex_secret'` fallbacks (`authMiddleware`, `generateToken`, `socket`). A repository-wide search confirms none remain in `Backend/src`.
- `utils/jwtConfig.js` is the only place that reads `JWT_SECRET`; signing and verification both use it (HS256).
- `server.js` calls `assertJwtConfigured()` right after `dotenv.config()` and exits with a clear message when the secret is missing, empty, or a known placeholder (`shippnex_secret`, `your_strong_random_jwt_secret_here`, ...). **Verified:** the server refuses to start with an empty `JWT_SECRET`.
- A secret shorter than 32 characters only logs a warning (value never logged).
- The existing local secret was checked for length / placeholder only (not printed): it is 128 characters and not a placeholder, so the existing deployment keeps working. `.env` and production values were not modified.
- **Deployment note:** any environment that currently runs without `JWT_SECRET` (relying on the old fallback) will now fail to boot. Set the variable first.
- Tokens signed with the old fallback secret, `alg=none`, expired, malformed, or signed with another secret are all rejected (401).

---

## 8. Tests executed

### 8.1 Method
Isolated server on port 5099 against in-memory MongoDB; dummy Razorpay/Cloudinary/SMS/Firebase/SMTP values; seeded 1 Super Admin, 9 admins (unrestricted, FG-only, FH-only, deleted, inactive, suspended, revocable, demotable, password-changer), 4 sellers across two brands, 2 users. Admin/Super Admin/user logins were exercised over HTTP; seller and user tokens for most checks were minted with the app's own payload shape. Every fix test asserts the **database state** as well as the HTTP code (for example "FH seller unchanged", "product untouched", "notification still not accepted").

### 8.2 Final results (fixed code): 250 checks, 249 pass

| Group | Pass | Fail |
|---|---:|---:|
| 1 Unauthenticated access to every formerly-open route (401) + no data changed | 37 | 0 |
| 1b Public routes remain public | 11 | 0 |
| 2 Wrong role (user/seller on admin routes) -> 403 | 16 | 0 |
| 3 Admin on Super-Admin-only APIs -> 403 | 18 | 0 |
| 4 Valid Super Admin requests | 9 | 0 |
| 5 Valid Admin requests | 7 | 0 |
| 6 JWT hardening (fallback secret, alg=none, expired, malformed, wrong secret, forged role, source scan) | 7 | 0 |
| 7 Admin account state (deleted, inactive, suspended-after-issue, revoked, demoted, login, password change, injection payload) | 16 | 0 |
| 8 Self-escalation (role, brands, status, global settings) | 4 | 0 |
| 9 Brand isolation (headers, query, ALL, pinned default, listings, cross-brand mutation, brand list, fail-closed flag) | 27 | 0 |
| 10 IDOR (products, orders, seller notifications, admin order actions, returns, customers) | 43 | 0 |
| 11 Employees / attendance / tasks | 16 | 0 |
| 12 Regression | 38 | 0 |
| 13 Informational (stack traces in error bodies) | 0 | 1 |

Required scenarios from the brief: unauthenticated admin request (401), user on admin API (403), admin on Super Admin API (403), valid Super Admin, valid Admin, other brand's data (403/404), manipulated brandId (403, and ignored on writes), deleted admin (401), inactive admin (403), admin changing own permissions (ignored, verified in DB), other seller's records (404), unauthorized order/payout/transaction access (404 / 403) - **all pass**.

### 8.3 Evidence the tests detect the flaws
The identical suite was run against the original code (`git archive HEAD`, no stash, separate directory): **92 of the first 172 recorded checks failed**, e.g. anonymous PUT/DELETE succeeded, seller B renamed seller A's product, a user token reached `/admin/orders`, deleted/inactive/revoked admins stayed authorised, an FG admin suspended an FH seller. The baseline run aborted at the order step because the anonymous attacks had deleted the product fixture - itself a demonstration of the problem. (On the original code the JWT-forgery checks J01-J06 "fail" only because `/admin/orders` was open to everyone.)

### 8.4 Existing unit tests
`node --test tests/` in `Backend`: 20 / 20 pass.

---

## 9. Regression testing results

| Area | Result |
|---|---|
| User registration/login | OTP send + verify (mock OTP, dev) -> token; token works on `/orders` - **pass** |
| Seller login | Phone + password -> token; profile works - **pass** |
| Seller registration | **Not tested** (needs OTP SMS + Razorpay fee, forbidden to trigger) |
| Admin login / Super Admin login | Pass; wrong-role login rejected; inactive rejected; profile update returns new token - **pass** |
| Brand selection | SA brand list, stores under brand_fg / brand_fh / ALL - **pass**; restricted admin pinned/limited - **pass** |
| Seller management | Admin approves own-brand seller, persisted - **pass** |
| Product management | Seller create/update, admin (scoped) update, public listing - **pass** |
| Orders | Place -> seller notified -> accept -> admin status update (valid) -> SA update; invalid status now 400 - **pass** |
| Inventory | SA inventory per brand, SA adjustment - **pass** |
| Commission | SA update persisted, legacy SA route works - **pass** |
| Payouts | Seller withdrawal -> visible to SA only for its brand -> approve -> process (mock UTR) - **pass** |
| Reports | All four report types - **pass** |
| Employees / attendance / tasks | Create, list, search/pagination, check-in/out, SA attendance read, task create/update - **pass** |
| Cart | Add to cart - **pass** |

### Behaviour changes that clients may notice
1. `/admin/*` calls now need a valid token (previously none). Cookies and `Authorization: Bearer` both work as before.
2. Restricted admins (and any admin whose brand header is invalid) can receive 400/403 on `/admin/*` where they previously saw everything; lists contain only their brand.
3. `PUT /admin/sellers/:id/commission` and `PUT /admin/commission-settings` are now **Super Admin only** (admins get 403). If the admin panel exposes these controls to plain admins, the UI should hide them or you should decide to re-allow them.
4. Blocking/unblocking a customer requires all-brand access.
5. `PUT /admin/orders/:id/status` with an unknown `orderStatus` returns 400 instead of 500.
6. Admin/Super Admin login with non-string credentials returns 400 instead of 500.
7. A password change for an admin invalidates their other sessions.
8. Super Admin is now accepted on routes that listed only `admin`.
9. A seller creating a product can no longer name another seller in the body.

---

## 10. Remaining security issues and items needing your input

### 10.1 Cannot be fixed safely without additional information
1. **Brand assignment default.** All existing admins have no `authorizedBrands`, and there is no API to set them. Making "no brands = no access" the default would lock every current admin out. *Needed:* decide each admin's brand list (or `*`), set it in MongoDB, then deploy with `ADMIN_BRANDS_FAIL_CLOSED=true`. Until then any unrestricted admin can reach every brand (this is the single largest residual risk for the "cross-brand" objective).
2. **Module-level permissions.** The brief asks to verify module permissions "where implemented": none exist in the backend, and the only admin-management UI is a frontend-only mock. Designing the permission model and Admin management API (create, assign brand/permissions, deactivate, role changes) is Phase 2. Today `status`, `tokenVersion` and `authorizedBrands` can only be changed directly in the database.
3. **Public uploads.** `/upload` and `/upload/base64` must stay unauthenticated for pre-login registration documents; only a rate limit was added. *Needed:* decide whether registration should use a short-lived upload token.
4. **Who may approve payouts, set pricing, edit policies, FAQs, banners, categories, referral/fee/membership settings.** Plain admins can still do these (they were admin-only before). Only commission settings and seller commission were moved to Super Admin. Tell me which of these are Super-Admin-only by policy.

### 10.2 Not addressed in Phase 1 (known, from the audit)
- No rate limiting/lockout on admin, seller or user (OTP) login; `send-otp` returns the OTP when `NODE_ENV !== 'production'` (H6).
- CORS reflects any origin with credentials; no helmet/CSP tightening; 50 MB body limit (H8, M4).
- Stack traces in error bodies (still observed: the one failing informational check); invalid ObjectId in some admin routes, negative cart quantity, product negative values still return 500 (M2, M8).
- Weak admin password policy (4 characters) (M1).
- Seller and captain tokens are not rechecked against account status (only admins and customers are) (M7).
- Unescaped `search` regexes in a few list endpoints; mass-assignment in `updateEmployee` (body applied wholesale).

### 10.3 Modules not covered by the IDOR sweep (not tested, unchanged)
Delivery challan, proforma invoice and POS **by-id** endpoints (only their list endpoints use city scope), transport bookings, wallet, referral, ratings, membership purchase, captain app routes, the Super Admin payout/transaction **detail** endpoints. These need the same ownership/brand review.

### 10.4 Design limits of the brand model
- Orders have no `brandId`. They are attributed through the seller they were routed to; an order never routed to a seller is invisible to brand-restricted admins (fail-closed). Customers (shared across brands) are attributed through their orders. Captains are attributed by city. Adding `brandId` to Order, PayoutRequest, PlatformLedger, RefundRequest, ReturnRequest and the document models is the proper fix (Phase 2).
- `tokenVersion` revokes all sessions of an account, but there is no endpoint yet to bump it (planned with Admin management).
- The admin dashboard `warehouses` block is still hard-coded sample data.

### 10.5 Test limits
Seller registration, real payment gateways, e-mail/SMS/push and file uploads were not exercised. The baseline comparison is partial for the reason given in 8.3.

---

## 11. Rollout checklist
1. Confirm `JWT_SECRET` is set in every environment (the server now refuses to start otherwise).
2. Deploy; admins and Super Admins stay logged in unless their account is missing/inactive (tokens without `tokenVersion` are treated as version 0).
3. Assign `authorizedBrands` to brand-restricted admins in MongoDB; verify each can only see their brand.
4. Then set `ADMIN_BRANDS_FAIL_CLOSED=true`.
5. Check the admin panel for screens that call the two Super-Admin-only commission routes.
6. Schedule Phase 2: Admin management + permissions API, `brandId` on commerce/finance documents, rate limiting/CORS/helmet, by-id sweep of the modules in 10.3.

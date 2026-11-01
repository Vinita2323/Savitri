# SAVITRI - API Test Results

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

## Summary
- Live API tests reported: **263** (**203 pass**, **58 fail**, **2 inconclusive**). Pass rate on conclusive tests: **77.8%**. Security-relevant subset (authN/authZ/brand/security): **66/104 = 63.5%**.
- "PASS" means the expected business outcome was observed *and*, where relevant, the MongoDB document was inspected - an HTTP 200 alone was never treated as success (for example, status-update calls that returned 200 without changing the order were caught).
- Endpoint existence probes: **17** admin-management/notification/quotation/permission paths returned 404 (not implemented) - listed in "Missing endpoints", excluded from the pass rate.
- Not every one of the 368 registered handlers was exercised: 125 distinct method+path combinations were called. Untested handlers include captain app routes, transport booking, POS, membership purchase, referral, wallet top-ups, rating and most seller-registration-fee routes. They are **implemented but not tested**, and are not counted as working.

## Results by category
| Category | Tests | Pass | Fail | Inconclusive | Pass % (conclusive) |
|---|---:|---:|---:|---:|---:|
| auth | 7 | 7 | 0 | 0 | 100.0% |
| security | 16 | 9 | 6 | 1 | 60.0% |
| authz | 49 | 26 | 22 | 1 | 54.2% |
| brand | 41 | 31 | 10 | 0 | 75.6% |
| employee | 14 | 11 | 3 | 0 | 78.6% |
| task | 5 | 4 | 1 | 0 | 80.0% |
| attendance | 7 | 7 | 0 | 0 | 100.0% |
| seller | 12 | 10 | 2 | 0 | 83.3% |
| product | 9 | 4 | 5 | 0 | 44.4% |
| category | 4 | 4 | 0 | 0 | 100.0% |
| inventory | 5 | 5 | 0 | 0 | 100.0% |
| order | 19 | 15 | 4 | 0 | 78.9% |
| commission | 8 | 7 | 1 | 0 | 87.5% |
| payout | 12 | 12 | 0 | 0 | 100.0% |
| sync | 2 | 1 | 1 | 0 | 50.0% |
| refund | 13 | 12 | 1 | 0 | 92.3% |
| reports | 6 | 6 | 0 | 0 | 100.0% |
| audit | 1 | 1 | 0 | 0 | 100.0% |
| finance | 4 | 4 | 0 | 0 | 100.0% |
| delivery | 5 | 5 | 0 | 0 | 100.0% |
| quotation | 2 | 2 | 0 | 0 | 100.0% |
| pos | 1 | 1 | 0 | 0 | 100.0% |
| dashboard | 2 | 1 | 1 | 0 | 50.0% |
| user | 14 | 13 | 1 | 0 | 92.9% |
| settings | 5 | 5 | 0 | 0 | 100.0% |
| **All** | **263** | **203** | **58** | **2** | **77.8%** |

## Static route inventory (368 handlers)
*Parser limitations: routes that use a guard stored in a variable (for example `captainAuth` in `captainRoutes.js`) or a multi-line declaration are shown as "no guard found" although they are protected. Treat this table as a map of where to look, not as a vulnerability list; confirmed unauthenticated routes are those in the live results below. The role and brand-scope column of the full inventory was derived from the same parse and is available in the harness output `inventory.json` (kept outside the repository).
| Route file | Handlers (static) | Auth by guard | No guard found (static)* |
|---|---:|---:|---:|
| addressRoutes | 5 | 5 | 0 |
| adminAuthRoutes | 5 | 3 | 2 |
| adminRoutes | 23 | 7 | 16 |
| bannerRoutes | 4 | 3 | 1 |
| brandRoutes | 6 | 6 | 0 |
| captainAuthRoutes | 6 | 0 | 6 |
| captainRegistrationFeeRoutes | 9 | 4 | 5 |
| captainRoutes | 37 | 0 | 37 |
| cartRoutes | 6 | 6 | 0 |
| categoryRoutes | 4 | 3 | 1 |
| commissionRoutes | 5 | 3 | 2 |
| deliveryChallanRoutes | 11 | 11 | 0 |
| employeeRoutes | 21 | 21 | 0 |
| faqRoutes | 5 | 0 | 5 |
| membershipRoutes | 28 | 25 | 3 |
| orderRoutes | 11 | 11 | 0 |
| policyRoutes | 5 | 3 | 2 |
| posRoutes | 12 | 12 | 0 |
| pricingRoutes | 18 | 15 | 3 |
| profileEditRequestRoutes | 6 | 6 | 0 |
| proformaInvoiceRoutes | 13 | 13 | 0 |
| publicBrandRoutes | 2 | 0 | 2 |
| quotationRoutes | 1 | 1 | 0 |
| ratingRoutes | 6 | 0 | 6 |
| razorpayWebhookRoutes | 1 | 0 | 1 |
| referralRoutes | 11 | 10 | 1 |
| returnRoutes | 17 | 17 | 0 |
| reviewRoutes | 6 | 5 | 1 |
| sellerAuthRoutes | 9 | 3 | 6 |
| sellerRegistrationFeeRoutes | 9 | 4 | 5 |
| sellerRoutes | 1 | 0 | 1 |
| superAdminAuthRoutes | 3 | 1 | 2 |
| superAdminRoutes | 22 | 22 | 0 |
| supportRoutes | 4 | 0 | 4 |
| transportBookingRoutes | 11 | 0 | 11 |
| uploadRoutes | 1 | 0 | 1 |
| userAuthRoutes | 4 | 2 | 2 |
| userNotificationRoutes | 4 | 4 | 0 |
| vehicleTypeRoutes | 6 | 0 | 6 |
| walletRoutes | 7 | 7 | 0 |
| wishlistRoutes | 3 | 3 | 0 |

## Confirmed routes with no authentication (live-verified)
`GET /api/admin/dashboard/stats`, `/admin/users`, `/admin/sellers`, `/admin/captains`, `/admin/captains/available`, `/admin/orders`; `PUT /admin/sellers/:id/details` (edited a seller anonymously), `PUT /admin/sellers/:id/status`, `DELETE /admin/sellers/:id`, `PUT /admin/orders/:id/status`, `PUT/DELETE /admin/captains/:id...`; `DELETE /sellers/:id`; `GET /transport/vehicles/admin/all`, `POST /transport/vehicles` (created), `PUT/DELETE /transport/vehicles/:id`; `GET /faqs/admin`, `POST/PUT/DELETE /faqs` (created); `PUT /support-settings` (changed); `POST/PUT/DELETE /products` (created/edited); `POST /upload` and `/upload/base64` (static review; live test inconclusive).

## Missing endpoints (404 on probe)
- `POST /super-admin/admins`
- `PUT /super-admin/admins/:id`
- `PUT /super-admin/admins/:id/permissions`
- `POST /auth/admin/register`
- `POST /admin/create`
- `GET /super-admin/admins`
- `GET /admin/admins`
- `GET /super-admin/permissions`
- `GET /super-admin/settings`
- `GET /super-admin/notifications`
- `GET /admin/notifications`
- `GET /notifications`
- `GET /super-admin/employees`
- `GET /super-admin/quotations`
- `GET /quotations`
- `GET /super-admin/attendance`
- `GET /super-admin/tasks`

## Failed tests (58)
| ID | Endpoint | Test | Expected | Actual | Note |
|---|---|---|---|---|---|
| AU04 | POST `/auth/admin/login` | NoSQL operator injection in login email | 400|401 | 500 | status 500 |
| SE01 | POST `/auth/admin/login` | 40 rapid bad admin logins -> any 429? | (custom) | 401 | NO rate limiting on admin login |
| UA01 | GET `/admin/dashboard/stats` | No JWT: GET /admin/dashboard/stats | 401 | 200 |  |
| UA02 | GET `/admin/users` | No JWT: GET /admin/users | 401 | 200 |  |
| UA03 | GET `/admin/sellers` | No JWT: GET /admin/sellers | 401 | 200 |  |
| UA04 | GET `/admin/captains` | No JWT: GET /admin/captains | 401 | 200 |  |
| UA05 | GET `/admin/orders` | No JWT: GET /admin/orders | 401 | 200 |  |
| UA06 | GET `/admin/captains/available` | No JWT: GET /admin/captains/available | 401 | 200 |  |
| UA07 | GET `/transport/vehicles/admin/all` | No JWT: GET /transport/vehicles/admin/all | 401 | 200 |  |
| UA08 | GET `/faqs/admin` | No JWT: GET /faqs/admin | 401 | 200 |  |
| UA20 | PUT `/admin/sellers/:id/status` | No JWT: approve seller | 401 | 400 | Cannot approve seller until the registration fee is paid (or marked not_required when fee is disabled). |
| UA21 | PUT `/admin/sellers/:id/details` | No JWT: edit seller details | 401 | 200 | Seller details updated successfully |
| UA22 | POST `/faqs` | No JWT: create FAQ | 401 | 201 | FAQ created successfully |
| UA23 | PUT `/support-settings` | No JWT: change support settings | 401 | 200 | Support settings updated successfully |
| UA24 | POST `/transport/vehicles` | No JWT: create vehicle type | 401 | 201 | Vehicle type created successfully |
| UA25 | POST `/products` | No JWT: create product | 401 | 201 | Product created successfully |
| UA28 | PUT `/admin/orders/:id/status` | No JWT: update order status | 401 | 404 | Order not found |
| RA08 | PUT `/admin/commission-settings` | Brand-restricted admin changes GLOBAL commission settings | 403 | 200 | status 200 |
| RA12 | POST `/quotations/send-email` | SUPER ADMIN token on quotation send-email (route lists "super-admin") | 400|200 | 403 | status 403 (403 = super_admin blocked) |
| RA13 | POST `/categories` | SUPER ADMIN creates category (route is protect("admin") only) | 200|201|400 | 403 | status 403 |
| PE02 | PUT `/admin/profile` | Admin sets 4-char password (weak policy) | 400 | 200 | 4-char password accepted? status 200 |
| DA01 | GET `/super-admin/payouts` | Token of DELETED admin still accepted on /super-admin/payouts | 401|403 | 200 | status 200 |
| DA02 | PUT `/admin/sellers/:id/status` | Token of DELETED admin on seller approve | 401|403 | 400 | Deleted admin token passed auth (request reached controller; 400 is a business rule, not an auth rejection) |
| BR02 | GET `/super-admin/brands` | Brand-restricted admin(fg) lists brands - should see only own | (custom) | 200 | sees 4 brands |
| BR08 | GET `/super-admin/payouts` | Unrestricted admin (no authorizedBrands) -> any brand (fail-open default) | 403 | 200 | status 200 |
| BR14 | GET `/admin/sellers` | FG-admin GET /admin/sellers returns FH sellers? | (custom) | 200 | total=3 FH=1 |
| BR15 | PUT `/admin/sellers/:id/status` | FG-admin suspends FH seller via /admin/sellers/:id/status | (custom) | 200 | FH seller status now: suspended |
| BR16 | PUT `/admin/sellers/:id/commission` | FG-admin changes FH seller commission | (custom) | 200 | FH commission now 77 |
| EM05 | GET `/employees/:id` | IDOR: FH-admin reads FG employee by id | 403|404 | 200 | status 200 |
| EM05b | PATCH `/employees/:id/status` | IDOR: FH-admin deactivates FG employee | (custom) | 200 | before=Active after=Inactive |
| EM05c | PUT `/employees/:id` | IDOR: FH-admin edits FG employee | (custom) | 200 | designation=HACKED-BY-FH |
| EM16 | PATCH `/employees/tasks/:id/status` | IDOR: FH-admin completes FG task | (custom) | 200 | before=To Do after=Completed |
| SL07 | PUT `/admin/sellers/:id/status` | Invalid ObjectId -> 4xx not 500 | 400|404 | 500 | status 500 |
| SL11 | GET `/profile-edit-requests` | Seller list edit requests | 200|403 | 404 | status 404 |
| PR02b | POST `/products` | Create product with empty body rejected | 400 | 201 | {"success":true,"message":"Product created successfully","product":{"name":"Product 171607","category":"Groceries","subC |
| PR02c | POST `/products` | Negative price/stock rejected | 400 | 500 | {"success":false,"message":"Product validation failed: mrp: Path `mrp` (-5) is less than minimum allowed value (0)., sal |
| PR03 | PUT `/products/:id` | IDOR: another seller edits my product | (custom) | 200 | name now HIJACKED price 1 |
| PR04 | PUT `/products/:id` | Anonymous edits product | (custom) | 200 | name now HIJACKED-ANON |
| PR13 | DELETE `/products/:id` | IDOR: seller FG deletes FH product | (custom) | 200 | DELETED |
| CM07 | PUT `/admin/sellers/:id/commission` | Plain admin sets seller commission (SA has "authority" route) | 403 | 200 | commission now 55 (admin route allows it) |
| PO10 | PUT `/super-admin/payouts/:id/approve` | Plain admin approves payout | 403 | 200 | status 200 (design: admin allowed) |
| PO13 | - `-` | WithdrawalRequest reflects PAID status of its PayoutRequest | (custom) | 200 | withdrawal.status=PENDING payout.status=PAID |
| DB02 | GET `/admin/dashboard/stats?brandId=` | Admin dashboard stats vary by brand (brand-aware?) | (custom) | 200 | identical across brands = not brand-scoped |
| US12 | POST `/auth/user/verify-otp` | OTP brute-force limiter (8 wrong attempts -> 429?) | (custom) | 401 | no lockout observed |
| OR03b | - `-` | Order document carries a brand reference | (custom) | 200 | brandId=undefined brand=undefined sellerId=undefined |
| OR07b | PUT `/orders/seller/notifications/:id/accept` | IDOR: other seller accepts notification | 403|404 | 200 | status 200 |
| OR08b | GET `/admin/orders` | FH-admin must NOT see FG order on /admin/orders | (custom) | 200 | FH admin sees FG order: true |
| OR10 | PUT `/admin/orders/:id/status` | State machine: Accepted -> Delivered (skipping Packed/Out for Delivery) should be blocked | (custom) | 200 | orderStatus=Delivered http 200 |
| OR12 | PUT `/admin/orders/:id/status` | IDOR: FH-admin cancels FG order | (custom) | 200 | orderStatus=Cancelled |
| OR13 | PUT `/admin/orders/:id/status` | Invalid status value rejected (4xx not 500) | 400|422 | 500 | status 500 {"success":false,"message":"Order validation failed: orderStatus: `NotAStatus` is not a va |
| OR15 | GET `/orders/:id` | IDOR: a DIFFERENT real user reads my order by id | 403|404 | 200 | status 200 deliveryOtp exposed: true |
| RT01 | GET `/returns/admin/all` | SUPER ADMIN views returns (/returns/admin/all is protect("admin")) | 200 | 403 | status 403 |
| US03c | POST `/cart/add` | Negative quantity rejected | 400 | 500 | status 500 |
| OR19b | - `-` | After Delivered: seller earnings credited + ledger entry created | (custom) | 200 | totalEarnings=0 wallet=4000 ledgerRows=2 |
| RT07 | GET `/returns/admin/all` | FH-admin returns list excludes FG returns | (custom) | 200 | FH admin sees 1 |
| RT09 | PUT `/returns/admin/:id/approve` | IDOR: FH-admin approves FG return | (custom) | 200 | FH-admin approved FG return: status REQUESTED -> CAPTAIN_ASSIGNMENT_PENDING (cross-brand IDOR confirmed) |
| ER01 | GET `/admin/sellers/x/x` | Unknown route leaks stack trace? | (custom) | 404 | stack in body: true |
| ER02 | PUT `/admin/sellers/notanid/status` | 500 error leaks stack trace/internal message | (custom) | 500 | stack in body: true msg=Cast to ObjectId failed for value "notanid" (type string) at path "_id" for mode |

## Full test log
| ID | Module | Method | Endpoint | Test | Expected | Actual | Result | Note |
|---|---|---|---|---|---|---|---|---|
| AU01 | Admin Auth | POST | `/auth/admin/login` | Admin login valid | 200 | 200 | PASS | Admin login successful |
| AU02 | Admin Auth | POST | `/auth/admin/login` | Admin login wrong password | 401 | 401 | PASS | Invalid email or password |
| AU03 | Admin Auth | POST | `/auth/admin/login` | Admin login missing fields | 400 | 400 | PASS | Please provide both email and password |
| AU04 | Admin Auth | POST | `/auth/admin/login` | NoSQL operator injection in login email | 400|401 | 500 | FAIL | status 500 |
| AU05 | SuperAdmin Auth | POST | `/auth/super-admin/login` | Super admin login valid | 200 | 200 | PASS | Super Admin financial authentication successful |
| AU06 | SuperAdmin Auth | POST | `/auth/super-admin/login` | Admin using super-admin login endpoint | 403 | 403 | PASS | Access denied: Standard administrators cannot access the Super Admin Financial Panel |
| AU07 | Admin Auth | POST | `/auth/admin/login` | Super admin may log in via admin endpoint (info) | 200 | 200 | PASS | super_admin can log into admin login endpoint |
| AU08 | SuperAdmin Auth | GET | `/auth/super-admin/me` | SA /me | 200 | 200 | PASS |  |
| AU09 | SuperAdmin Auth | GET | `/auth/super-admin/me` | Admin token on SA /me | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| AU10 | SuperAdmin Auth | GET | `/auth/super-admin/me` | No token on SA /me | 401 | 401 | PASS | Not authorized, no token provided |
| AU11 | JWT | GET | `/auth/super-admin/me` | alg=none forged token | 401 | 401 | PASS | Not authorized, token failed |
| AU12 | JWT | GET | `/auth/super-admin/me` | Token forged with hardcoded fallback secret (server has JWT_SECRET set) | 401 | 401 | PASS | Not authorized, token failed |
| AU13 | JWT | GET | `/auth/super-admin/me` | Expired token | 401 | 401 | PASS | Not authorized, token failed |
| SE01 | Rate limit | POST | `/auth/admin/login` | 40 rapid bad admin logins -> any 429? | (custom) | 401 | FAIL | NO rate limiting on admin login |
| UA01 | Unauth read | GET | `/admin/dashboard/stats` | No JWT: GET /admin/dashboard/stats | 401 | 200 | FAIL |  |
| UA02 | Unauth read | GET | `/admin/users` | No JWT: GET /admin/users | 401 | 200 | FAIL |  |
| UA03 | Unauth read | GET | `/admin/sellers` | No JWT: GET /admin/sellers | 401 | 200 | FAIL |  |
| UA04 | Unauth read | GET | `/admin/captains` | No JWT: GET /admin/captains | 401 | 200 | FAIL |  |
| UA05 | Unauth read | GET | `/admin/orders` | No JWT: GET /admin/orders | 401 | 200 | FAIL |  |
| UA06 | Unauth read | GET | `/admin/captains/available` | No JWT: GET /admin/captains/available | 401 | 200 | FAIL |  |
| UA07 | Unauth read | GET | `/transport/vehicles/admin/all` | No JWT: GET /transport/vehicles/admin/all | 401 | 200 | FAIL |  |
| UA08 | Unauth read | GET | `/faqs/admin` | No JWT: GET /faqs/admin | 401 | 200 | FAIL |  |
| UA09 | Unauth read | GET | `/support-settings` | No JWT: GET /support-settings | 200 | 200 | PASS | public by design |
| UA10 | Unauth read | GET | `/products` | No JWT: GET /products | 200 | 200 | PASS | public by design |
| UA11 | Unauth read | GET | `/categories` | No JWT: GET /categories | 200 | 200 | PASS | public by design |
| UA12 | Unauth read | GET | `/banners` | No JWT: GET /banners | 200 | 200 | PASS | public by design |
| UA20 | Admin Seller | PUT | `/admin/sellers/:id/status` | No JWT: approve seller | 401 | 400 | FAIL | Cannot approve seller until the registration fee is paid (or marked not_required when fee is disabled). |
| UA21 | Admin Seller | PUT | `/admin/sellers/:id/details` | No JWT: edit seller details | 401 | 200 | FAIL | Seller details updated successfully |
| UA22 | FAQ | POST | `/faqs` | No JWT: create FAQ | 401 | 201 | FAIL | FAQ created successfully |
| UA23 | Support | PUT | `/support-settings` | No JWT: change support settings | 401 | 200 | FAIL | Support settings updated successfully |
| UA24 | Vehicles | POST | `/transport/vehicles` | No JWT: create vehicle type | 401 | 201 | FAIL | Vehicle type created successfully |
| UA25 | Products | POST | `/products` | No JWT: create product | 401 | 201 | FAIL | Product created successfully |
| UA26 | Upload | POST | `/upload/base64` | No JWT: base64 upload (re-test) | 401 | 500 | INCONCLUSIVE | INCONCLUSIVE: hit in-process concurrency limiter ("Slow down") before auth; route has no protect() per static review. Cloudinary creds are d |
| UA27 | Category | POST | `/categories` | No JWT: create category | 401 | 401 | PASS | Not authorized, no token provided |
| UA28 | Admin Orders | PUT | `/admin/orders/:id/status` | No JWT: update order status | 401 | 404 | FAIL | Order not found |
| UA29 | SA Payouts | GET | `/super-admin/payouts` | No JWT: SA payouts | 401 | 401 | PASS | Not authorized, no token provided |
| UA30 | Commission | GET | `/admin/commission-settings` | No JWT: commission settings | 401 | 401 | PASS | Not authorized, no token provided |
| RA01 | SA Ledger | GET | `/super-admin/transactions` | Admin on SA-only /transactions | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA02 | SA Commission | GET | `/super-admin/commissions` | Admin on SA-only /commissions | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA03 | SA Commission | PUT | `/super-admin/sellers/:id/commission` | Admin on SA-only commission update | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA04 | SA Audit | GET | `/super-admin/audit-logs` | Admin on audit-logs | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA05 | Brands | POST | `/super-admin/brands` | Admin creating brand | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA06 | Wallet | GET | `/wallet/admin/withdrawals` | Admin on SA withdrawals list | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA07 | Wallet | PUT | `/wallet/admin/withdrawals/:id/status` | Admin approving withdrawal | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| RA08 | Commission | PUT | `/admin/commission-settings` | Brand-restricted admin changes GLOBAL commission settings | 403 | 200 | FAIL | status 200 |
| RA09 | SA Payouts | GET | `/super-admin/payouts` | Admin on payouts list (allowed by design) | 200 | 200 | PASS |  |
| RA10 | SA Payouts | GET | `/super-admin/payouts` | User token on SA payouts | 403 | 403 | PASS | Forbidden: Access restricted to admin or super_admin |
| RA11 | SA Payouts | GET | `/super-admin/payouts` | Seller token on SA payouts | 403 | 403 | PASS | Forbidden: Access restricted to admin or super_admin |
| RA12 | Quotation | POST | `/quotations/send-email` | SUPER ADMIN token on quotation send-email (route lists "super-admin") | 400|200 | 403 | FAIL | status 403 (403 = super_admin blocked) |
| RA13 | Category | POST | `/categories` | SUPER ADMIN creates category (route is protect("admin") only) | 200|201|400 | 403 | FAIL | status 403 |
| PE01 | Privilege | PUT | `/admin/profile` | Admin self-escalation via PUT /admin/profile (role/authorizedBrands) | (custom) | 200 | PASS | role=admin brands=["brand_fg"] |
| PE02 | Auth | PUT | `/admin/profile` | Admin sets 4-char password (weak policy) | 400 | 200 | FAIL | 4-char password accepted? status 200 |
| DA01 | Admin lifecycle | GET | `/super-admin/payouts` | Token of DELETED admin still accepted on /super-admin/payouts | 401|403 | 200 | FAIL | status 200 |
| DA02 | Admin lifecycle | PUT | `/admin/sellers/:id/status` | Token of DELETED admin on seller approve | 401|403 | 400 | FAIL | Deleted admin token passed auth (request reached controller; 400 is a business rule, not an auth rejection) |
| BR01 | Brands | GET | `/super-admin/brands` | SA list brands | 200 | 200 | PASS | count ["success","count","brands"] |
| BR02 | Brands | GET | `/super-admin/brands` | Brand-restricted admin(fg) lists brands - should see only own | (custom) | 200 | FAIL | sees 4 brands |
| BR03 | Isolation | GET | `/super-admin/payouts` | FG-admin requests FH brand via X-Brand-Id | 403 | 403 | PASS | Forbidden: You are not authorized to access records for brand/region "Fashion Hub" (Bhopal). |
| BR04 | Isolation | GET | `/super-admin/payouts?brandId=` | FG-admin requests FH via ?brandId | 403 | 403 | PASS | Forbidden: You are not authorized to access records for brand/region "Fashion Hub" (Bhopal). |
| BR05 | Isolation | GET | `/super-admin/payouts` | FG-admin requests FG | 200 | 200 | PASS |  |
| BR06 | Isolation | GET | `/super-admin/payouts` | FG-admin with no brand header (defaults to ALL?) | 403 | 403 | PASS | Access denied: You are not authorized to view consolidated All-Region data. |
| BR07 | Isolation | GET | `/super-admin/payouts` | FG-admin requests ALL | 403 | 403 | PASS | Access denied: You are not authorized to view consolidated All-Region data. |
| BR08 | Isolation | GET | `/super-admin/payouts` | Unrestricted admin (no authorizedBrands) -> any brand (fail-open default) | 403 | 200 | FAIL | status 200 |
| BR09 | Isolation | GET | `/super-admin/payouts` | Invalid brand id | 400 | 400 | PASS | Invalid Brand/Region identifier. Option not found in authorized registry. |
| BR10 | Stores | GET | `/super-admin/stores` | SA stores brand_fg | 200 | 200 | PASS | items 2 keys success,scope,total,count,page,pages,stats,brandCounts,stores |
| BR11 | Stores | GET | `/super-admin/stores` | SA stores brand_fh differ from fg | (custom) | 200 | PASS | fg=2 fh=1 |
| BR12 | Stores | GET | `/super-admin/stores` | SA ALL stores | 200 | 200 | PASS | items 3 |
| BR13 | IDOR | GET | `/super-admin/stores/:id` | FG-admin reads FH store by id under FG scope | 403|404 | 403 | PASS | status 403 |
| BR14 | IDOR | GET | `/admin/sellers` | FG-admin GET /admin/sellers returns FH sellers? | (custom) | 200 | FAIL | total=3 FH=1 |
| BR15 | IDOR | PUT | `/admin/sellers/:id/status` | FG-admin suspends FH seller via /admin/sellers/:id/status | (custom) | 200 | FAIL | FH seller status now: suspended |
| BR16 | IDOR | PUT | `/admin/sellers/:id/commission` | FG-admin changes FH seller commission | (custom) | 200 | FAIL | FH commission now 77 |
| BR17 | Orders | GET | `/admin/orders` | FG-admin GET /admin/orders (unscoped route) | 200 | 200 | PASS | keys success,orders,count |
| BR18 | Dashboard | GET | `/admin/dashboard/stats` | FG-admin dashboard stats | 200 | 200 | PASS |  |
| BR19 | Users | GET | `/admin/users` | FG-admin lists users | 200 | 200 | PASS |  |
| EM01 | Employees | POST | `/employees` | FG-admin creates employee (forged body.brandId=FH) | 200|201 | 201 | PASS | {"success":true,"message":"Employee \"Emp FG\" created successfully with ID BRAN-2026-0007.","employee":{"employeeId":"BRAN-2026-0007","user |
| EM02 | Employees | POST | `/employees` | Forged brandId ignored; stored under FG | (custom) | 201 | PASS | stored brandId=brand_fg |
| EM03 | Employees | GET | `/employees` | FH-admin list employees | 200 | 200 | PASS | n=2 keys success,total,page,pages,employees |
| EM04 | Employees | GET | `/employees` | FH-admin cannot see FG employees | (custom) | 200 | PASS | n=2 |
| EM06 | Employees | GET | `/employees` | SA ALL employees | 200 | 200 | PASS | n=6 |
| EM07 | Attendance | GET | `/employees/attendance/records` | SA attendance records | 200 | 200 | PASS |  |
| EM08 | Tasks | GET | `/employees/tasks/all` | SA ALL tasks | 200 | 200 | PASS | {"success":true,"total":1,"page":1,"pages":1,"tasks":[{"_id":"6ae76709b099e353c0f0e978","taskId":"TSK-2026-0001","title" |
| EM09 | Employees | GET | `/employees/dashboard-summary` | Dashboard summary | 200 | 200 | PASS | {"success":true,"metrics":{"totalEmployees":7,"activeEmployees":6,"presentToday":0,"absentToday":6,"lateToday":0,"currentlyCheckedIn":0,"mis |
| BC01 | Brand CRUD | POST | `/super-admin/brands` | SA creates brand | 200|201 | 201 | PASS | {"success":true,"message":"Business Brand created successfully and persisted in MongoDB","brand":{"brandId":"brand_aud_tst_9227","name":"Aud |
| BC02 | Brand CRUD | POST | `/super-admin/brands` | Brand persisted in MongoDB | (custom) | 201 | PASS | brandId=brand_aud_tst_9227 code=AUD-TST |
| BC03 | Brand CRUD | POST | `/super-admin/brands` | Duplicate brand code rejected | 400|409 | 400 | PASS | Brand with code "AUD-TST" already exists. Please choose a different code. |
| BC04 | Brand CRUD | POST | `/super-admin/brands` | Brand missing name rejected | 400 | 400 | PASS | Brand name is required. |
| BC05 | Brand CRUD | PUT | `/super-admin/brands/:id` | SA updates brand | 200 | 200 | PASS | Brand updated successfully |
| BC06 | Brand CRUD | PUT | `/super-admin/brands/:id` | Update persisted | (custom) | 200 | PASS | name=Audit Brand Renamed |
| BC07 | Brand CRUD | PATCH | `/super-admin/brands/:id/status` | Toggle brand status | 200 | 200 | PASS | Brand status changed to Inactive |
| BC08 | Brand CRUD | PUT | `/super-admin/brands/:id` | Admin updates brand | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| BC09 | Brand CRUD | DELETE | `/super-admin/brands/:id` | Admin deletes brand | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| BC11 | Brand CRUD | DELETE | `/super-admin/brands/:id` | SA deletes brand | 200 | 200 | PASS | Brand permanently deleted from MongoDB |
| BC12 | Brand CRUD | DELETE | `/super-admin/brands/:id` | Brand removed from DB | (custom) | 200 | PASS | removed |
| EM02b | Employees | POST | `/employees` | Duplicate email rejected | 409 | 409 | PASS | An employee with email "emp.fg@audit.test" already exists (Employee ID: BRAN-2026-0007). |
| EM02c | Employees | POST | `/employees` | Missing fields rejected | 400 | 400 | PASS | Full name, email, and phone number are required. |
| EM05 | Employees | GET | `/employees/:id` | IDOR: FH-admin reads FG employee by id | 403|404 | 200 | FAIL | status 200 |
| EM05b | Employees | PATCH | `/employees/:id/status` | IDOR: FH-admin deactivates FG employee | (custom) | 200 | FAIL | before=Active after=Inactive |
| EM05c | Employees | PUT | `/employees/:id` | IDOR: FH-admin edits FG employee | (custom) | 200 | FAIL | designation=HACKED-BY-FH |
| EM05d | Employees | PUT | `/employees/:id` | FG-admin updates own employee (persist) | (custom) | 200 | PASS | designation=Senior Exec |
| EM12 | Attendance | GET | `/employees/attendance/records` | SA reads attendance (brand_fg) | 200 | 200 | PASS | {"success":true,"total":0,"page":1,"pages":0,"records":[]} |
| EM13 | Attendance | GET | `/employees/attendance/records` | FH-admin attendance excludes FG employee | (custom) | 200 | PASS | n=0 |
| EM14 | Tasks | POST | `/employees/tasks` | Create task | 200|201 | 201 | PASS | {"success":true,"message":"Task \"Audit task\" created with ID TSK-2026-0001.","task":{"taskId":"TSK-2026-0001","title":"Audit task","descri |
| EM15 | Tasks | POST | `/employees/tasks` | Task persisted with brand | (custom) | 201 | PASS | brandId=brand_fg |
| EM16 | Tasks | PATCH | `/employees/tasks/:id/status` | IDOR: FH-admin completes FG task | (custom) | 200 | FAIL | before=To Do after=Completed |
| EM17 | Tasks | PATCH | `/employees/tasks/:id/status` | FG-admin task status change persists | (custom) | 200 | PASS | after=In Progress |
| EM18 | Employees | GET | `/employees?page&limit&search` | Search+pagination | 200 | 200 | PASS | {"success":true,"total":7,"page":1,"pages":7,"employees":[{"_id":"6ae76709b099e353c0f0e977","employeeId":"BRAN-2026-0007","user":null,"fullN |
| SL01 | Seller approval | PUT | `/admin/sellers/:id/status` | FG-admin approves pending FG seller | 200 | 200 | PASS | {"success":true,"message":"Seller status updated to APPROVED","seller":{"location":{"type":"Point","coordinates":[0,0]},"warehouseLocation": |
| SL02 | Seller approval | PUT | `/admin/sellers/:id/status` | Approval persisted | (custom) | 200 | PASS | status=approved |
| SL03 | Seller sync | GET | `/admin/sellers` | SA sees approved seller in /admin/sellers | (custom) | 200 | PASS | n=3 |
| SL04 | Seller sync | GET | `/super-admin/stores` | SA stores(brand_fg) lists approved seller | (custom) | 200 | PASS | n=2 |
| SL05 | Seller approval | PUT | `/admin/sellers/:id/status` | Invalid status value rejected | 400 | 400 | PASS | Invalid status: bogus |
| SL06 | Seller approval | PUT | `/admin/sellers/:id/status` | Unknown seller id -> 404 | 404 | 404 | PASS | Seller not found |
| SL07 | Seller approval | PUT | `/admin/sellers/:id/status` | Invalid ObjectId -> 4xx not 500 | 400|404 | 500 | FAIL | status 500 |
| SL08 | Seller list | GET | `/admin/sellers?search&status&page&limit` | Search/filter/pagination query accepted | 200 | 200 | PASS | n=3 (limit=1 honoured?) |
| SL09 | Seller profile | GET | `/auth/seller/profile` | Seller GET profile | 200 | 200 | PASS |  |
| SL10 | Seller profile | PUT | `/auth/seller/profile` | Seller updates profile | 200 | 200 | PASS | {"success":true,"message":"Seller profile updated successfully","seller":{"location":{"type":"Point","coordinates":[0,0]},"warehouseLocation |
| SL10b | Seller profile | GET | `/auth/seller/profile` | Profile update persisted | (custom) | 200 | PASS |  |
| SL11 | Profile edit requests | GET | `/profile-edit-requests` | Seller list edit requests | 200|403 | 404 | FAIL | status 404 |
| PR01 | Products | POST | `/products` | Seller creates product | 200|201 | 201 | PASS | {"success":true,"message":"Product created successfully","product":{"name":"FG Shirt","category":"Apparel","subCategory":"","brand":"","unit |
| PR02 | Products | POST | `/products` | Product persisted w/ sellerId | (custom) | 201 | PASS | status=Published sellerId=6ae7675a731605d21606ffc9 brand="" |
| CT01 | Category | POST | `/categories` | Admin creates category | 200|201 | 201 | PASS | {"success":true,"message":"Category created successfully","category":{"name":"Audit Cat","icon":"Package","image":"","parent":null,"status": |
| CT02 | Category | PUT | `/categories/:id` | Admin updates category | 200 | 200 | PASS | Category updated successfully |
| CT03 | Category | DELETE | `/categories/:id` | Admin deletes category | 200 | 200 | PASS | Category deleted permanently |
| CT04 | Category | GET | `/categories` | Public list | 200 | 200 | PASS |  |
| PR02b | Products | POST | `/products` | Create product with empty body rejected | 400 | 201 | FAIL | {"success":true,"message":"Product created successfully","product":{"name":"Product 171607","category":"Groceries","subC |
| PR02c | Products | POST | `/products` | Negative price/stock rejected | 400 | 500 | FAIL | {"success":false,"message":"Product validation failed: mrp: Path `mrp` (-5) is less than minimum allowed value (0)., sal |
| PR03 | Products | PUT | `/products/:id` | IDOR: another seller edits my product | (custom) | 200 | FAIL | name now HIJACKED price 1 |
| PR04 | Products | PUT | `/products/:id` | Anonymous edits product | (custom) | 200 | FAIL | name now HIJACKED-ANON |
| PR05 | Products/Inventory | PUT | `/products/:id` | Seller updates stock+price (persist) | (custom) | 200 | PASS | stock=45 price=750 |
| PR06 | Products | GET | `/products?admin=true` | Admin sees seller product | (custom) | 200 | PASS | n=4 keys success,count,total,page,limit,products |
| PR07 | SA Inventory | GET | `/super-admin/inventory` | SA inventory(brand_fg) shows FG product | (custom) | 200 | PASS | keys success,scope,total,count,page,pages,summary,items,inventory {"success":true,"scope":{"isAll":false,"brandId":"brand_fg","brandName":"F |
| PR08 | SA Inventory | GET | `/super-admin/inventory` | SA inventory(brand_fh) must NOT show FG product | (custom) | 200 | PASS |  |
| PR09 | SA Inventory | POST | `/super-admin/inventory/adjust` | SA adjusts stock ADD 5 | 200 | 200 | PASS | {"success":true,"message":"Stock successfully adjusted from 50 to 55 units.","product":{"id":"6ae7675bb099e353c0f0e97c", |
| PR10 | SA Inventory | POST | `/super-admin/inventory/adjust` | Adjustment persisted (50->55) | (custom) | 200 | PASS | stock=55 |
| PR12 | SA Inventory | POST | `/super-admin/inventory/adjust` | Admin adjusts stock (SA-only) | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| PR13 | Products | DELETE | `/products/:id` | IDOR: seller FG deletes FH product | (custom) | 200 | FAIL | DELETED |
| OR01 | Order | POST | `/orders` | User places COD order | 200|201 | 201 | PASS | {"success":true,"message":"Order placed successfully!","order":{"orderId":"ORD-230709-2828","user":"6ae7675a731605d21606ffcc","items":[{"pro |
| OR02 | Order | POST | `/orders` | Order persisted in DB | (custom) | 201 | PASS | orderStatus=Placed fields=sellerStatus,itemsTotal,grandTotal,sellerCommissionRate,sellerCommissionAmount,sellerEarning,captainCommissionAmou |
| OR20 | Order | POST | `/orders` | Order with empty body rejected | 400 | 400 | PASS | Valid shipping address with Full Name, Phone, and Street Address is required |
| OR21 | Order | POST | `/orders` | Order unauthenticated | 401 | 401 | PASS | Not authorized, no token provided |
| OR22 | Order | GET | `/orders/:id` | Order invalid id => 4xx | 400|404 | 404 | PASS | status 404 |
| CM01 | Commission | PUT | `/super-admin/sellers/:id/commission` | SA updates seller commission | 200 | 200 | PASS | {"success":true,"message":"Commission rate for \"Seller FG\" updated to 12%","seller":{"id":"6ae7675a731605d21606ffc9","businessName":"Selle |
| CM02 | Commission | PUT | `/super-admin/sellers/:id/commission` | Commission persisted | (custom) | 200 | PASS | commission=12 |
| CM03 | Commission | PUT | `/super-admin/sellers/:id/commission` | Commission >100 rejected | 400 | 400 | PASS | Commission rate must be a valid number between 0% and 100% |
| CM04 | Commission | PUT | `/super-admin/sellers/:id/commission` | Negative commission rejected | 400 | 400 | PASS | Commission rate must be a valid number between 0% and 100% |
| CM05 | Commission | GET | `/super-admin/commissions` | SA commissions list (brand_fg) | 200 | 200 | PASS | {"success":true,"scope":{"isAll":false,"brandId":"brand_fg","brandName":"Fashion Gallary","city":"Indore"},"count":2,"sellers":[{"_id":"6ae7 |
| CM06 | Commission | GET | `/admin/commission-reports` | Commission reports | 200 | 200 | PASS |  |
| CM07 | Commission | PUT | `/admin/sellers/:id/commission` | Plain admin sets seller commission (SA has "authority" route) | 403 | 200 | FAIL | commission now 55 (admin route allows it) |
| PO01 | Payout | POST | `/wallet/seller/withdraw` | Seller requests withdrawal | 201 | 201 | PASS | Withdrawal request for ₹1000.00 submitted successfully! |
| PO02 | Payout | POST | `/wallet/seller/withdraw` | Over-balance withdrawal rejected | 400 | 400 | PASS | Insufficient available wallet balance. Maximum withdrawable: ₹4000.00 |
| PO03 | Payout | POST | `/wallet/seller/withdraw` | Negative withdrawal rejected | 400 | 400 | PASS | Please enter a valid withdrawal amount greater than 0 |
| PO04 | Payout | POST | `/wallet/seller/withdraw` | Wallet debited on request | (custom) | 200 | PASS | walletBalance=4000 |
| PO05 | Payout | - | `-` | WithdrawalRequest + PayoutRequest both created | (custom) | 200 | PASS | withdrawal=true payout=true |
| PO06 | Payout | GET | `/wallet/admin/withdrawals` | SA lists withdrawals | 200 | 200 | PASS | {"success":true,"withdrawals":[{"bankDetails":{"bankName":"TestBank","accountNumber":"1234567890","ifscCode":"TEST0000001","accountHolderNam |
| PO07 | Payout | GET | `/super-admin/payouts` | SA payouts (brand_fg) shows request | (custom) | 200 | PASS | keys success,scope,counts,payouts,page,pages,total {"success":true,"scope":{"isAll":false,"brandId":"brand_fg","brandName":"Fashion Gallary" |
| PO08 | Payout | GET | `/super-admin/payouts` | SA payouts (brand_fh) must NOT show FG payout | (custom) | 200 | PASS | payout leaked to other brand scope: false |
| PO08b | Payout | GET | `/super-admin/payouts` | FH-admin payouts must NOT show FG payout | (custom) | 200 | PASS |  |
| PO09 | Payout | PUT | `/super-admin/payouts/:id/approve` | IDOR: FH-admin approves FG payout | (custom) | 403 | PASS | status=PENDING |
| PO10 | Payout | PUT | `/super-admin/payouts/:id/approve` | Plain admin approves payout | 403 | 200 | FAIL | status 200 (design: admin allowed) |
| PO11 | Payout | PUT | `/super-admin/payouts/:id/process` | SA processes payout (mock UTR); status persists | 200 | 200 | PASS | payout.status=PAID {"success":true,"message":"Payout #WTH-231136372 processed and marked as PAID","payout":{"bankDetails":{"bankName":"Test |
| PO12 | Payout | PUT | `/super-admin/payouts/:id/process` | Duplicate process (idempotency) rejected | 400|409 | 400 | PASS | status 400 |
| PO13 | Payout | - | `-` | WithdrawalRequest reflects PAID status of its PayoutRequest | (custom) | 200 | FAIL | withdrawal.status=PENDING payout.status=PAID |
| PO14 | Payout | PUT | `/super-admin/payouts/:id/reject` | Reject an already PAID payout blocked | 400|409 | 400 | PASS | payout.status after=PAID http 400 |
| PO15 | Settlements | GET | `/super-admin/settlements/sellers` | Seller settlements | 200 | 200 | PASS | {"success":true,"scope":{"isAll":true,"brandId":"ALL","brandName":"All Regions","city":null},"summary":{"totalSettledAmo |
| PO16 | Settlements | GET | `/super-admin/settlements/captains` | Captain settlements | 200 | 200 | PASS |  |
| RF01 | Refund | GET | `/super-admin/refunds` | SA refunds list shows request | (custom) | 200 | PASS | count 1 |
| RF02 | Refund | PUT | `/super-admin/refunds/:id/process` | Process unknown refund -> 404 | 404 | 404 | PASS | Refund request not found |
| RP01 | Reports | GET | `/super-admin/reports` | SA financial reports | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-revenue"} |
| RP02 | Reports | GET | `/super-admin/reports` | Reports brand-filtered (brand_fh) | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-revenue"} |
| AL01 | Audit Logs | GET | `/super-admin/audit-logs` | SA audit logs (after payout actions) | (custom) | 200 | PASS | {"success":true,"count":3,"total":3,"page":1,"pages":1,"logs":[{"_id":"6ae7675bb099e353c0f0e985","logId":"AUD-171896684","actorId":"6ae7675a |
| FA01 | Adjustments | GET | `/super-admin/financial-adjustments` | List adjustments | 200 | 200 | PASS |  |
| FA02 | Adjustments | POST | `/super-admin/financial-adjustments` | Create adjustment missing fields -> 400 | 400 | 400 | PASS | Please provide entityType (SELLER/CAPTAIN), entityId, type (CREDIT/DEBIT), amount, and reason |
| DL01 | Delivery | GET | `/super-admin/delivery-partners` | SA delivery partners (brand_fg) | 200 | 200 | PASS | {"success":true,"scope":{"isAll":false,"brandId":"brand_fg","brandName":"Fashion Gallary","city":"Indore"},"total":0,"co |
| DL02 | Delivery | GET | `/admin/captains` | Admin captains list | 200 | 200 | PASS |  |
| DC01 | Delivery Challan | GET | `/delivery-challans` | List challans (brand_fg) | 200 | 200 | PASS | {"success":true,"challans":[],"pagination":{"page":1,"limit":15,"totalPages":1,"totalItems":0},"stats":{"total":0,"draft |
| PI01 | Proforma | GET | `/proforma-invoices` | List proforma invoices | 200 | 200 | PASS | {"success":true,"invoices":[],"pagination":{"page":1,"limit":15,"totalItems":0,"totalPages":1},"stats":{"total":0,"draft |
| POS1 | POS | GET | `/pos/sales` | List POS sales | 200|404 | 404 | PASS | status 404 |
| DB01 | Dashboard | GET | `/admin/dashboard/stats` | Admin dashboard stats | 200 | 200 | PASS | {"success":true,"stats":{"totalUsers":1,"totalCategories":8,"totalSubcategories":0,"totalProducts":3,"productSoldOut":2,"lowStockProducts":0 |
| DB02 | Dashboard | GET | `/admin/dashboard/stats?brandId=` | Admin dashboard stats vary by brand (brand-aware?) | (custom) | 200 | FAIL | identical across brands = not brand-scoped |
| US01 | Product listing | GET | `/products` | Public product list | 200 | 200 | PASS | keys success,count,total,page,limit,products,message |
| US02 | Cart | GET | `/cart` | User cart | 200 | 200 | PASS |  |
| US03 | Cart | POST | `/cart/add` | Add to cart | 200|201 | 200 | PASS | {"success":true,"message":"Item added to cart","cart":{"items":[{"product":{"_id":"6ae7675bb099e353c |
| US04 | Wishlist | POST | `/wishlist/toggle` | Toggle wishlist | 200|201 | 200 | PASS | {"success":true,"isAdded":true,"message":"Added to wishlist","wishlist":{"products":[{"_id":"6ae7675 |
| US05 | Addresses | GET | `/user/addresses` | List addresses | 200 | 200 | PASS |  |
| US06 | Notifications | GET | `/user/notifications` | User notifications (after order status change) | 200 | 200 | PASS | {"success":true,"notifications":[],"unreadCount":0} |
| US07 | Wallet | GET | `/wallet/user` | User wallet | 200 | 200 | PASS |  |
| US08 | Seller profile | GET | `/auth/seller/profile` | User token on seller profile | 403 | 403 | PASS | Forbidden: Access restricted to seller |
| US09 | User auth | POST | `/auth/user/send-otp` | Send OTP (mock) | 200 | 200 | PASS | {"success":true,"message":"OTP processed successfully","phone":"8000000001","otp":"123456"} |
| US10 | User auth | POST | `/auth/user/verify-otp` | Wrong OTP rejected | 400|401 | 400 | PASS | Invalid OTP code |
| US11 | User auth | POST | `/auth/user/verify-otp` | Mock OTP verify (dev) -> token | 200 | 200 | PASS | token issued: true |
| US12 | User auth | POST | `/auth/user/verify-otp` | OTP brute-force limiter (8 wrong attempts -> 429?) | (custom) | 401 | FAIL | no lockout observed |
| US13 | Reviews | GET | `/reviews/product/:id` | Product reviews list | 200 | 200 | PASS |  |
| WH01 | Webhook | POST | `/payments/razorpay/webhook` | Razorpay webhook with bad signature rejected | 400|401|403 | 400 | PASS | status 400 |
| WH02 | Webhook | POST | `/payments/razorpay/webhook` | Razorpay webhook with no signature rejected | 400|401|403 | 400 | PASS | status 400 |
| WH03 | Payment | POST | `/orders/razorpay/verify-payment` | Forged payment verification rejected | 400|401|403|404 | 400 | PASS | status 400 |
| SEC1 | Data exposure | GET | `/admin/users` | /admin/users does not leak OTP/password fields | (custom) | 200 | PASS | leak check |
| SEC2 | Data exposure | GET | `/admin/sellers` | /admin/sellers no password/otp (bank fields visible?) | (custom) | 200 | PASS | accountNumber exposed: true |
| PR11 | SA Inventory | POST | `/super-admin/inventory/adjust` | Over-deduct (negative stock) prevented | (custom) | 400 | PASS | stock=55 status 400 |
| OR03 | Order | POST | `/orders` | Stock decremented after order | (custom) | 200 | PASS | stock=54 |
| OR03b | Order model | - | `-` | Order document carries a brand reference | (custom) | 200 | FAIL | brandId=undefined brand=undefined sellerId=undefined |
| OR04 | Order | GET | `/orders` | User lists own orders | (custom) | 200 | PASS |  |
| OR05 | Order | GET | `/orders/:id` | User order detail | 200 | 200 | PASS |  |
| OR06 | Order | GET | `/orders/seller/notifications` | Seller receives order notification | (custom) | 200 | PASS | n=1 |
| OR06b | Order | GET | `/orders/seller/notifications` | Other seller does NOT receive it | (custom) | 200 | PASS |  |
| OR07b | Order | PUT | `/orders/seller/notifications/:id/accept` | IDOR: other seller accepts notification | 403|404 | 200 | FAIL | status 200 |
| OR07 | Order | PUT | `/orders/seller/notifications/:id/accept` | Seller accepts order | 200 | 200 | PASS | {"success":true,"message":"Order accepted successfully and assigned to nearest delivery captain!","notification":{"customerDetails":{"name": |
| OR08 | Order | GET | `/admin/orders` | FG-admin monitors order | (custom) | 200 | PASS |  |
| OR08b | Order | GET | `/admin/orders` | FH-admin must NOT see FG order on /admin/orders | (custom) | 200 | FAIL | FH admin sees FG order: true |
| OR09 | Order | GET | `/admin/orders` | SA views order | (custom) | 200 | PASS |  |
| OR10 | Order | PUT | `/admin/orders/:id/status` | State machine: Accepted -> Delivered (skipping Packed/Out for Delivery) should be blocked | (custom) | 200 | FAIL | orderStatus=Delivered http 200 |
| OR12 | Order | PUT | `/admin/orders/:id/status` | IDOR: FH-admin cancels FG order | (custom) | 200 | FAIL | orderStatus=Cancelled |
| OR13 | Order | PUT | `/admin/orders/:id/status` | Invalid status value rejected (4xx not 500) | 400|422 | 500 | FAIL | status 500 {"success":false,"message":"Order validation failed: orderStatus: `NotAStatus` is not a va |
| OR15 | Order | GET | `/orders/:id` | IDOR: a DIFFERENT real user reads my order by id | 403|404 | 200 | FAIL | status 200 deliveryOtp exposed: true |
| OR16 | Order | GET | `/user/notifications` | User receives notification of status updates | (custom) | 200 | PASS | n=6 |
| OR18 | Order | PUT | `/admin/orders/:id/status` | Admin marks Delivered (persist) | (custom) | 200 | PASS | orderStatus=Delivered paymentStatus=Paid |
| OR20x | Ledger | GET | `/super-admin/transactions` | SA transactions show delivered order | (custom) | 200 | PASS | rows 2 |
| OR21x | Commission | GET | `/super-admin/commissions` | SA commission records after delivery | 200 | 200 | PASS | {"success":true,"scope":{"isAll":false,"brandId":"brand_fg","brandName":"Fashion Gallary","city":"Indore"},"count":2,"sellers":[{"_id":"6ae7 |
| OR22x | Dashboard | GET | `/super-admin/dashboard/metrics` | SA dashboard metrics reflect delivered order | 200 | 200 | PASS | {"success":true,"scope":{"isAll":true,"brandId":"ALL","brandName":"All Regions","city":null,"state":null},"metrics":{"totalPlatformRevenue": |
| RT01 | Returns | GET | `/returns/admin/all` | SUPER ADMIN views returns (/returns/admin/all is protect("admin")) | 200 | 403 | FAIL | status 403 |
| RT02 | Returns | GET | `/returns/admin/all` | Admin views returns | 200 | 200 | PASS | {"success":true,"returns":[],"pagination":{"total":0,"page":1,"pages":0,"limit":20}} |
| RT03 | Returns | GET | `/returns/my-returns` | User my-returns | 200 | 200 | PASS |  |
| RT04 | Returns | POST | `/returns` | User requests return on delivered order | 200|201 | 201 | PASS | {"success":true,"message":"Return request submitted successfully. Our team will review your request shortly.","returnRequest":{"returnId":"R |
| RT05 | Returns | POST | `/orders/:id/return` | User order-level return | 200|201|400 | 400 | PASS | {"success":false,"message":"Only delivered orders are eligible for return. Current status is \"Out for Delivery\"."} |
| RF03 | Refund | PUT | `/super-admin/refunds/:id/process` | SA approves refund (persist) | (custom) | 200 | PASS | status=APPROVED {"success":true,"message":"Refund #RFD-AUDIT1 updated to APPROVED","refund":{"userName":"","userPhone":"","paymentMethod |
| RF04 | Refund | PUT | `/super-admin/refunds/:id/process` | SA completes refund (mock, no gateway call?) | 200 | 200 | PASS | {"success":true,"message":"Refund #RFD-AUDIT1 updated to COMPLETED","refund":{"_id":"6ae76797abe70e85c36f01af","refundId":"RFD-AUDIT1","orde |
| RF05 | Refund | PUT | `/super-admin/refunds/:id/process` | Changing COMPLETED refund blocked | 409 | 409 | PASS | Refund is already COMPLETED and cannot be changed. |
| RF06 | Refund | PUT | `/super-admin/refunds/:id/process` | FH-admin processes FG refund (already completed → 409 expected anyway) | 403|404|409 | 409 | PASS | status 409 |
| PO13b | Payout | PUT | `/wallet/admin/withdrawals/:id/status` | Legacy /wallet/admin/withdrawals path updates PayoutRequest too | (custom) | 400 | PASS | withdrawal=PENDING payout=PAID http 400 {"success":false,"message":"Invalid withdrawal status"} |
| US03b | Cart | GET | `/cart` | Cart contains item | (custom) | 200 | PASS |  |
| US03c | Cart | POST | `/cart/add` | Negative quantity rejected | 400 | 500 | FAIL | status 500 |
| US14 | Reviews | POST | `/reviews` | Submit review (needs delivered order) | 200|201|400|403 | 400 | PASS | status 400 {"success":false,"message":"Products can only be rated and reviewed after the order has been successfully delivered."} |
| US15 | Orders | GET | `/orders` | Seller token on user order list | 403 | 403 | PASS | Forbidden: Access restricted to user |
| OR19b | Earnings | - | `-` | After Delivered: seller earnings credited + ledger entry created | (custom) | 200 | FAIL | totalEarnings=0 wallet=4000 ledgerRows=2 |
| OR22y | Dashboard | GET | `/super-admin/dashboard/metrics` | SA dashboard metrics brand_fh excludes FG order | (custom) | 200 | PASS | {"success":true,"scope":{"isAll":false,"brandId":"brand_fh","brandName":"Fashion Hub","city":"Bhopal","state":"Madhya Pradesh"},"metrics":{" |
| RT04b | Returns | POST | `/returns` | IDOR: other user files return on my order | 403|404 | 404 | PASS | status 404 |
| RT06 | Returns | GET | `/returns/admin/all` | Admin sees return | (custom) | 200 | PASS | n=1 |
| RT07 | Returns | GET | `/returns/admin/all` | FH-admin returns list excludes FG returns | (custom) | 200 | FAIL | FH admin sees 1 |
| RT08 | Returns | GET | `/returns/seller/returns` | Seller sees return | (custom) | 200 | PASS | n=1 |
| RT09 | Returns | PUT | `/returns/admin/:id/approve` | IDOR: FH-admin approves FG return | (custom) | 200 | FAIL | FH-admin approved FG return: status REQUESTED -> CAPTAIN_ASSIGNMENT_PENDING (cross-brand IDOR confirmed) |
| ER01 | Error handling | GET | `/admin/sellers/x/x` | Unknown route leaks stack trace? | (custom) | 404 | FAIL | stack in body: true |
| ER02 | Error handling | PUT | `/admin/sellers/notanid/status` | 500 error leaks stack trace/internal message | (custom) | 500 | FAIL | stack in body: true msg=Cast to ObjectId failed for value "notanid" (type string) at path "_id" for mode |
| UP02 | Upload | POST | `/upload/base64` | Non-image payload accepted by base64 upload? | 400|415|401 | 500 | INCONCLUSIVE | INCONCLUSIVE: same as UA26 |
| AT01 | Attendance | POST | `/employees/attendance/check-in` | Check-in (active employee) | 200|201 | 200 | PASS | {"success":true,"message":"Checked in successfully at 9:55:54 pm. (Late by 776 mins)","record":{"employee":"6ae76709b099e353c0f0e977","emplo |
| AT02 | Attendance | POST | `/employees/attendance/check-in` | Attendance record persisted with brandId | (custom) | 200 | PASS | brandId=brand_fg |
| AT03 | Attendance | POST | `/employees/attendance/check-out` | Check-out | 200|201 | 200 | PASS | {"success":true,"message":"Checked out successfully at 9:55:54 pm. Total duration: 0h 0m.","record":{"shift":{"id":null,"name":"Standard Gen |
| AT04 | Attendance | POST | `/employees/attendance/check-in` | Duplicate check-in same day blocked | 400|409 | 400 | PASS | status 400 |
| AT05 | Attendance | POST | `/employees/attendance/check-in` | IDOR: FH-admin checks-in FG employee | 403|404 | 400 | PASS | Rejected with 400 (employee not resolvable under FH scope) - blocked |
| AT06 | Attendance | GET | `/employees/attendance/records` | SA reads FG attendance (sync) | (custom) | 200 | PASS | n=1 |
| AT07 | Attendance | GET | `/employees/attendance/records` | FH-admin attendance excludes FG | (custom) | 200 | PASS |  |
| TK01 | Tasks | POST | `/employees/tasks` | FH-admin assigns task to FG employee | (custom) | 400 | PASS | rejected 400 |
| RP_transactions | Reports | GET | `/super-admin/reports?type=transactions` | Report type=transactions | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-r |
| RP_seller-settlements | Reports | GET | `/super-admin/reports?type=seller-settlements` | Report type=seller-settlements | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-r |
| RP_captain-settlements | Reports | GET | `/super-admin/reports?type=captain-settlements` | Report type=captain-settlements | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-r |
| RP_platform-revenue | Reports | GET | `/super-admin/reports?type=platform-revenue` | Report type=platform-revenue | 200 | 200 | PASS | {"success":true,"message":"Select a valid report type: transactions, seller-settlements, captain-settlements, platform-r |
| RP_authz | Reports | GET | `/super-admin/reports` | Admin on reports | 403 | 403 | PASS | Forbidden: Access restricted to super_admin |
| GS01 | Global settings | GET | `/pricing/active` | Public active pricing | 200 | 200 | PASS |  |
| GS02 | Global settings | GET | `/commission-settings/current` | Public commission rates | 200 | 200 | PASS |  |
| GS03 | Global settings | GET | `/admin/commission-settings` | Commission settings read (SA) | 200 | 200 | PASS |  |
| GS04 | Global settings | GET | `/policies` | Policies public list | 200 | 200 | PASS |  |
| GS05 | Global settings | GET | `/pricing` | Pricing admin list | 200|404 | 404 | PASS | status 404 |
| GS06 | Global settings | PUT | `/pricing/delivery` | Plain admin writes global delivery pricing | 403|404 | 404 | PASS | status 404 |
| DC02 | Delivery Challan | POST | `/delivery-challans` | Create with empty body rejected (4xx) | 400|422 | 400 | PASS | status 400 {"success":false,"message":"Client and Order references are required to create a delivery challan"} |
| PI02 | Proforma | POST | `/proforma-invoices` | Create with empty body rejected (4xx) | 400|422 | 400 | PASS | status 400 {"success":false,"message":"Client company name, phone, and email are required."} |
| DC03 | Delivery Challan | GET | `/delivery-challans` | Challan list without brand header (restricted admin) | 403 | 403 | PASS | status 403 |

## Test types performed
Valid requests; invalid/missing fields; invalid IDs; unauthorised (no JWT / wrong role / forged / expired / alg-none token); forbidden; duplicate (brand code, employee e-mail, check-in, payout process); invalid status transitions (order, payout, refund); pagination/search/filter smoke. **Not performed:** database-failure injection (no safe way without disturbing the DB), load/concurrency.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

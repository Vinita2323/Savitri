# SAVITRI - Security Audit

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

Security-relevant tests: **66/104 passed (63.5%)**. Severity is the auditor's assessment of exploitability x impact for an internet-facing deployment.

## CRITICAL
| # | Finding | Evidence |
|---|---|---|
| C1 | **Unauthenticated administrative API** - `routes/adminRoutes.js` applies `protect()` to only 7 of its 23 routes. Anyone can list all users, sellers, captains and orders (PII, bank details such as `accountNumber`), edit/suspend/delete sellers and captains, assign captains and change order status. | Live: no-token GET returned 200 on 6 endpoints; anonymous `PUT /admin/sellers/:id/details` -> "Seller details updated successfully". |
| C2 | **Unauthenticated writes on content & catalogue** - `/products` (POST/PUT/DELETE), `/transport/vehicles`, `/faqs`, `/support-settings`, `/sellers/:id` DELETE, `/upload`. | Live: 201/200 without token; anonymous product rename succeeded. Upload route has no `protect` (static). |
| C3 | **No admin identity lifecycle** - no way to disable or remove an admin; `protect()` never reloads the account. | Deleted admin's token accepted (200). Compromised admin tokens remain valid 8 h / 30 d. |

## HIGH
| # | Finding | Evidence |
|---|---|---|
| H1 | **Cross-brand IDOR** on `/admin/*`, `/returns/admin/*`, `/employees/:id`, task and leave endpoints. | Seller suspended, commission set to 77, order cancelled, return approved, employee edited/deactivated, task completed across brands. |
| H2 | **Order IDOR** - `GET /orders/:id` returns any order to any authenticated user, including `deliveryOtp`; seller can accept another seller's notification. | Verified with a second real user / second seller. |
| H3 | **Product ownership not checked** (update/delete). | Seller B renamed and re-priced seller A's product; seller A deleted seller B's product. |
| H4 | **Brand authorisation fails open** (no list / empty list = all brands + ALL scope). | Unrestricted admin reached `brand_fh`; `GET /super-admin/brands` returns all to restricted admin. |
| H5 | **Hard-coded JWT fallback secret** `'shippnex_secret'` (authMiddleware, generateToken, socket). If `JWT_SECRET` is unset in any environment, anyone can mint a super-admin token. | Static. (Forged token was correctly rejected when the real secret was set.) |
| H6 | **No rate limiting / lockout** on admin, super-admin, seller, user OTP logins; OTP returned in `send-otp` response outside production. | 40 rapid bad logins -> all 401; 8 wrong OTPs -> no lockout; response body contained `"otp":"123456"`. |
| H7 | **Privilege bypass of "Super Admin authority" routes** - plain admins can set seller commission, global commission settings, approve payouts. | Live: seller commission 55 set by admin; commission-settings PUT 200 for FG-only admin. |
| H8 | **CORS reflects any Origin with credentials** (`origin: (o,cb)=>cb(null,o||true)`) while auth uses cookies as well as Bearer tokens. | Static; cookie `SameSite=None; Secure` in production. |

## MEDIUM
| # | Finding |
|---|---|
| M1 | Password policy: 4-character admin passwords accepted (`PUT /admin/profile`). Hashing itself is bcrypt cost 10 - PASS. |
| M2 | Stack traces and Mongoose internals returned in 404/500 bodies (`"stack"` present). |
| M3 | Operator-injection payload in login (`{"email":{"$ne":null}}`) causes HTTP 500; no `express-mongo-sanitize`; many controllers pass `req.body`/`req.query` values into Mongo filters. No data disclosure observed, but input is not sanitised. |
| M4 | No security headers (helmet absent; custom CSP allows `'unsafe-inline'`/`'unsafe-eval'`, wildcard `https:` images). 50 MB JSON/urlencoded limit. |
| M5 | Sensitive data exposure: `/admin/sellers` returns bank account numbers/IFSC to any caller (see C1); order read exposes OTP (H2). |
| M6 | Role-string inconsistencies (`super-admin` vs `super_admin`; `protect('admin')` excluding super_admin) - availability issue and a sign that authorisation is hand-written per route. |
| M7 | Seller/captain tokens are not rechecked against account status (only `user` is). |
| M8 | Invalid ObjectId / bad enum / negative numbers yield 500 instead of 4xx in seller status, order status, cart, product creation. |
| M9 | File upload: extension+MIME allow-list and size limit exist for multipart; `/upload/base64` route validation not verified (live test inconclusive) and both routes are unauthenticated. |

## LOW
| # | Finding |
|---|---|
| L1 | `ensureBaselineBrands()` executes DB reads/writes on every scoped request. |
| L2 | Demo data seeded into production collections on first read (employees/tasks/leaves). |
| L3 | `Admin` shared by admin & super admin; super admin can sign in through the admin endpoint. |
| L4 | In-memory limiter (one route only) will not work across instances. |

## Controls that passed
- JWT: signature verified; expired, `alg=none` and wrong-secret tokens rejected (401).
- Role checks on all `protect('super_admin')` routes (admin, user and seller tokens -> 403).
- Self-escalation: `PUT /admin/profile` ignored `role` and `authorizedBrands`.
- Password hashing (bcrypt) and no password/OTP fields in user/seller list responses.
- Razorpay webhook: raw-body HMAC with constant-time compare; missing/bad signature -> 400. Forged payment verification -> 400.
- Brand scope validation on `/super-admin/*` and the `/employees` router (invalid brand 400, unauthorised brand 403, forged body brand ignored).
- Payout / refund state guards: duplicate process, reject-after-paid and change-after-completed blocked (409/400); over-balance and negative withdrawals rejected.
- Regex built from user input is escaped in `scopeMiddleware`; (minor: `deliveryChallanController` and `proformaInvoiceController` build a regex from the stored brand city without escaping - low risk because the city is Super-Admin-controlled brand data).

## Not assessed
Dependency CVEs (`npm audit`), TLS/proxy configuration, secrets in git history, Firebase/Cloudinary account configuration, DoS resilience.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.

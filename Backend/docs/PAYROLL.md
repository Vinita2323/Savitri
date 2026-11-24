# Employee Salary & Payroll module

Part of Employee Management. Backend: `src/services/payroll*.js`, `src/controllers/payrollController.js`, `src/routes/payrollRoutes.js`.
Frontend: `Frontend/src/modules/admin/employees/payroll/*`, `pages/EmployeePayrollPage.jsx`, `modules/employee/pages/PortalSalary.jsx`.

## 1. Money
All money is stored and transported as an **integer number of paise**. Amounts typed by users travel as text ("1234.50") and are parsed exactly
(at most 2 decimals, never negative). Every proportional amount is one exact BigInt step `(a x b x ...) / (c x ...)`, **rounded half up once per line**
(`src/utils/payrollMoney.js`). Days are "centi-days" (100 = one day), time is minutes. No floating point is used for a financial result.

## 2. Calculation rules (`src/services/payrollEngine.js`, pure and unit tested)

**Day classification** for every date in the period, in this order:

1. Before the employee's joining date, or no salary structure in force that day: not paid, not deducted.
2. Public holiday (non optional, brand or ALL) or a weekly off of the structure in force: HOLIDAY / WEEKLY_OFF. Never deducted.
3. Approved leave covering the day: paid or unpaid by the structure's *paid leave types* (Unpaid Leave is never paid). A half day leave is half leave plus half a working day (worked if the employee checked in).
4. Attendance record: Present / Late / Incomplete = full day; Half Day = 0.5 day; Absent = 0; "On Leave" with no leave request = paid leave (warning).
5. No attendance record on a past working day = Absent (same rule as the attendance reports).

A payroll period must be completely over (`periodTo` < today IST).
**Selfie data is never an input.** Missed selfies appear on the payroll only as an audit counter.

**Per salary type** (`B` = base amount in paise):

| Type | Earnings | Deductions |
|---|---|---|
| MONTHLY, calendar basis | `B x eligibleDays / daysInMonth` (weekly offs and holidays are paid) | per absent / unpaid day: `B x centiDays / (daysInMonth x 100)` |
| MONTHLY, working-days basis | `B x eligibleWorkingDays / workingDaysInMonth` | per day: `B / workingDaysInMonth` |
| WEEKLY fixed | `B x eligibleDays / 7` | per absent working day: `B / workingDaysPerWeek` |
| WEEKLY daily-rate | `B x payableCentiDays / (workingDaysPerWeek x 100)` | none (unpaid days are simply not earned) |
| DAILY | `B x payableCentiDays / 100` | none |
| HOURLY | `B x payableMinutes / 60` (worked minutes capped at the working hours of the day; paid leave counts a full working day) | none |

Weekly offs and holidays are paid in MONTHLY / WEEKLY-fixed; for DAILY / HOURLY / WEEKLY-daily-rate only if *Pay weekly offs / holidays* is set,
or if the employee actually worked that day (then it is paid like a working day).
A change of salary splits the period: each day uses the structure in force on that date (one earnings group per structure version and month).

**Deductions that never double count**: a Half Day is deducted once as a half day (it is not also a late); a holiday or weekly off inside a leave is not deducted.
- *Absent / unpaid leave / half day*: only for MONTHLY and WEEKLY-fixed, each switchable in the structure.
- *Late*: `lateAllowedPerPeriod` free lates per payroll period, then each extra late costs `lateDeductionPercent` % of one day's pay (full days only).

**Overtime**: minutes beyond the working hours of a Present/Late day (and of a day worked on an off day). Paid only for minutes an admin **approves** (policy can switch to automatic).
Rate: multiplier of the hourly equivalent (`B x 60 / (units x workingMinutes)`) or a fixed amount per hour.

**Adjustments**: bonuses/incentives (earnings), other deductions, and **advances** (recovered all at once or in instalments, never taking net pay below zero;
recovery is reserved when the payroll is calculated, released if it is recalculated or cancelled, and finalized at approval).
Net pay is never negative; if deductions exceed earnings the uncovered amount is shown (`shortfallPaise`) and not carried forward.

## 3. Workflow
`DRAFT -> CALCULATED -> PENDING_APPROVAL -> APPROVED -> PARTIALLY_PAID -> PAID`, or `CANCELLED`.
- One live payroll per employee and period (unique index on `activeKey`, plus an overlap check).
- Editable (overtime approval, adjustments with a reason, recalculation) only in DRAFT/CALCULATED. Every edit is written to `history[]` and the activity log.
- Approval locks the period's attendance (`423 PAYROLL_LOCKED` from attendance corrections and leave approvals). Cancel is the only way to unlock it.
- Payments are recorded manually. The paid total is incremented with an atomic conditional update, so it can never exceed net pay even with simultaneous requests;
  duplicate transaction references and retried requests (idempotency key) are rejected; status is recalculated atomically from the stored totals.
- **Nothing in this module moves money.** It records payments that were made elsewhere.

## 4. Permission matrix
| Action | Employee | Admin (own brand) | Super Admin |
|---|---|---|---|
| View own salary, payrolls (approved+), payments, slip | yes (own only) | - | - |
| Configure / revise salary | no | yes | yes |
| Bonuses, deductions, advances | no | yes | yes |
| Generate / recalculate / edit / submit / cancel (not yet approved) | no | yes | yes |
| Approve / send back | no | only if policy `adminCanApprove` (and not their own submission unless `allowSelfApproval`) | yes |
| Cancel an approved payroll | no | no | yes (only when no payments are recorded) |
| Record payment | no | policy `adminCanRecordPayments` (default yes) | yes |
| Reverse a payment | no | no | yes |
| Reports, dashboard, slips | no | yes (own brand) | yes |
| Change payroll policy, read audit trail | no | no | yes |

## 5. API (`/api/payroll`, Admin or Super Admin, brand scope enforced; employee side under `/api/employee-portal/salary`)
`GET/PUT /policy` - `GET /dashboard` - `GET /next-period` - `GET /salary`, `GET/PUT /salary/:employeeId` -
`GET/POST /adjustments`, `POST /adjustments/:id/cancel` -
`POST /payrolls/preview`, `POST /payrolls/generate`, `GET /payrolls`, `GET /payrolls/:id`, `POST /payrolls/:id/recalculate|submit|approve|reject|cancel`,
`PUT /payrolls/:id/overtime`, `POST|DELETE /payrolls/:id/adjustments[/:adjId]`, `POST /payrolls/:id/payments`, `GET /payrolls/:id/slip` (PDF) -
`GET /payments`, `POST /payments/:id/reverse` - `GET /reports/:type?format=json|xlsx|pdf` (`monthly, weekly, daily-wage, employee-wise, outstanding, deductions, payments, advances`) - `GET /audit`.
Employee: `GET /salary`, `/salary/payrolls`, `/salary/payrolls/:id`, `/salary/payrolls/:id/slip`, `/salary/payments`.

## 6. Data model
`EmployeeSalary` (current structure, one per employee), `SalaryStructureHistory` (immutable versions), `Payroll`, `PayrollItem` (every earning/deduction line),
`SalaryPayment`, `SalaryAdjustment` (bonus, deduction, advance), `PayrollPolicy`. Audit entries go to the existing `EmployeeActivityLog` (`salary_*`, `payroll_*`).

## 7. Deployment
- New dependency: `pdfkit` (run `npm install` in Backend).
- The app disables Mongoose autoIndex, so the payroll controller creates its indexes lazily on first use (`ensurePayrollIndexes`). Nothing else to run.
- MongoDB transactions are used for approve/cancel when the deployment is a replica set or mongos (Atlas); standalone MongoDB runs the same steps without a transaction (every critical step is also an atomic conditional update).
- No new environment variables.
- Existing data is untouched. Salary is opt-in per employee. Roll back by not exposing the routes; the collections are additive.

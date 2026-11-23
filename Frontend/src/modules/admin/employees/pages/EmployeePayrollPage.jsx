import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import payrollService from '../../../../services/payrollService';
import { Tabs } from '../payroll/payrollUi';
import PayrollDashboardTab from '../payroll/PayrollDashboardTab';
import SalarySetupTab from '../payroll/SalarySetupTab';
import PayrollRunsTab from '../payroll/PayrollRunsTab';
import AdjustmentsTab from '../payroll/AdjustmentsTab';
import ReportsTab from '../payroll/ReportsTab';
import PolicyAuditTab from '../payroll/PolicyAuditTab';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'setup', label: 'Salary setup' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'adjustments', label: 'Bonuses & advances' },
  { id: 'reports', label: 'Reports' },
  { id: 'policy', label: 'Policy & audit' },
];

export const EmployeePayrollPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const location = useLocation();
  const isSuper = location.pathname.startsWith('/super-admin');
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('payroll_tab') || 'dashboard'; } catch { return 'dashboard'; } });
  const [version, setVersion] = useState(0); // bump to refresh every tab after a change
  const [departments, setDepartments] = useState([]);
  const brandId = activeBrandId;

  useEffect(() => { try { sessionStorage.setItem('payroll_tab', tab); } catch { /* ignore */ } }, [tab]);
  useEffect(() => { payrollService.salaryList(brandId, { limit: 1 }).then((r) => setDepartments(r.departments || [])).catch(() => {}); }, [brandId]);
  const bump = () => setVersion((v) => v + 1);
  const common = { brandId, isSuper, version, onChanged: bump, departments };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="payroll" onNavigate={onNavigate} />
      <div className="px-4 sm:px-6 pt-5 space-y-5" data-testid="payroll-page">
        <div>
          <h2 className="m-0 text-xl font-extrabold text-slate-900">Salary & Payroll</h2>
          <p className="m-0 text-sm text-slate-500">Salary setup, payroll from approved attendance, approvals, recorded payments and salary slips.</p>
        </div>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'dashboard' && <PayrollDashboardTab {...common} />}
        {tab === 'setup' && <SalarySetupTab {...common} />}
        {tab === 'payroll' && <PayrollRunsTab {...common} />}
        {tab === 'adjustments' && <AdjustmentsTab {...common} />}
        {tab === 'reports' && <ReportsTab {...common} />}
        {tab === 'policy' && <PolicyAuditTab {...common} />}
      </div>
    </div>
  );
};

export default EmployeePayrollPage;

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { employeePortalService, employeeSession } from '../../../services/employeePortalService';

const EmployeeAuthContext = createContext(null);

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(() => (employeeSession.getToken() ? employeeSession.getEmployee() : null));
  // true while a stored session is being verified with the server
  const [checking, setChecking] = useState(() => Boolean(employeeSession.getToken()));

  useEffect(() => {
    if (!employeeSession.getToken()) {
      setChecking(false);
      return undefined;
    }
    let alive = true;
    employeePortalService
      .me()
      .then((emp) => {
        if (!alive) return;
        setEmployee(emp);
        employeeSession.save(employeeSession.getToken(), emp);
      })
      .catch(() => {
        if (!alive) return;
        employeeSession.clear();
        setEmployee(null);
      })
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await employeePortalService.login(identifier, password);
    employeeSession.save(data.token, data.employee);
    setEmployee(data.employee);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await employeePortalService.logout();
    employeeSession.clear();
    setEmployee(null);
  }, []);

  const value = useMemo(() => ({ employee, setEmployee, checking, login, logout, isAuthenticated: Boolean(employee) }), [employee, checking, login, logout]);
  return <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>;
};

export const useEmployeeAuth = () => {
  const ctx = useContext(EmployeeAuthContext);
  if (!ctx) throw new Error('useEmployeeAuth must be used inside EmployeeAuthProvider');
  return ctx;
};

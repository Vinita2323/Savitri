import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import treasuryService from '../../../../services/treasuryService';

/**
 * Cash & Bank state. The server (MongoDB double-entry treasury book) is the only source of truth:
 * balances, transactions, Razorpay clearing and settlements all come from the API. Nothing is kept in
 * localStorage and there is no demo data.
 */
const CashBankContext = createContext(null);

const messageOf = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const fail = (err, fallback) => { throw new Error(messageOf(err, fallback)); };

export const CashBankProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [unlinkedTransactions, setUnlinkedTransactions] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [gatewayPayments, setGatewayPayments] = useState([]);
  const [filter, setFilter] = useState('all'); // all | cash | bank | clearing
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
  const inFlight = useRef(new Set());

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [dash, unl] = await Promise.all([treasuryService.getDashboard(), treasuryService.getUnlinked()]);
      setAccounts(dash.accounts || []);
      setSummary(dash.summary || null);
      setIntegrity(dash.integrity || null);
      setUnlinkedTransactions(unl.unlinked || []);
      setLoadError('');
      setSelectedAccountId((cur) => {
        if (cur === 'unlinked' || cur === 'razorpay') return cur;
        if (cur && (dash.accounts || []).some((a) => a.id === cur)) return cur;
        const first = (dash.accounts || []).find((a) => a.type === 'bank' || a.type === 'cash');
        return first ? first.id : 'razorpay';
      });
    } catch (err) {
      setLoadError(messageOf(err, 'Could not load Cash and Bank from the server.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  // Live: a captured payment, settlement or refund shows up without a reload
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) refresh({ silent: true }); }, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const isRealAccountSelected = selectedAccountId && selectedAccountId !== 'unlinked' && selectedAccountId !== 'razorpay';
  const loadTransactions = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await treasuryService.getAccountTransactions(id);
      setTransactions(res.transactions || []);
    } catch (err) {
      setTransactions([]);
      setLoadError(messageOf(err, 'Could not load transactions.'));
    }
  }, []);
  useEffect(() => { if (isRealAccountSelected) loadTransactions(selectedAccountId); }, [selectedAccountId, isRealAccountSelected, loadTransactions]);

  const loadSettlements = useCallback(async (params = {}) => {
    try { setSettlements((await treasuryService.getSettlements(params)).settlements || []); }
    catch (err) { setLoadError(messageOf(err, 'Could not load settlements.')); }
  }, []);
  const loadReconciliation = useCallback(async () => {
    try { setReconciliation(await treasuryService.getReconciliation()); }
    catch (err) { setLoadError(messageOf(err, 'Could not load reconciliation.')); }
  }, []);
  const loadGatewayPayments = useCallback(async (params = {}) => {
    try { setGatewayPayments((await treasuryService.getGatewayPayments(params)).payments || []); }
    catch (err) { setLoadError(messageOf(err, 'Could not load Razorpay payments.')); }
  }, []);

  const afterChange = useCallback(async () => {
    await refresh({ silent: true });
    if (isRealAccountSelected) await loadTransactions(selectedAccountId);
  }, [refresh, loadTransactions, selectedAccountId, isRealAccountSelected]);

  // Guard against double submission: one in-flight request per action kind
  const once = useCallback(async (kind, fn) => {
    if (inFlight.current.has(kind)) throw new Error('Please wait - the previous request is still being processed.');
    inFlight.current.add(kind);
    try { return await fn(); } finally { inFlight.current.delete(kind); }
  }, []);

  const cashAccounts = useMemo(() => accounts.filter((a) => a.type === 'cash'), [accounts]);
  const bankAccounts = useMemo(() => accounts.filter((a) => a.type === 'bank'), [accounts]);
  const clearingAccounts = useMemo(() => accounts.filter((a) => a.type === 'gateway_clearing'), [accounts]);
  const feeAccounts = useMemo(() => accounts.filter((a) => a.type === 'gateway_fee'), [accounts]);
  const totalBalance = summary?.totalNetBalance ?? 0;
  const unlinkedTotal = useMemo(() => unlinkedTransactions.reduce((s, u) => s + (Number(u.amount) || 0), 0), [unlinkedTransactions]);
  const unlinkedCount = unlinkedTransactions.length;
  const selectedAccount = useMemo(() => (isRealAccountSelected ? accounts.find((a) => a.id === selectedAccountId) || null : null), [accounts, selectedAccountId, isRealAccountSelected]);
  const isUnlinkedSelected = selectedAccountId === 'unlinked';
  const isRazorpaySelected = selectedAccountId === 'razorpay';
  const currentAccountTransactions = isRealAccountSelected ? transactions : [];
  const selectAccount = useCallback((id) => setSelectedAccountId(id), []);

  // ── actions (all server-backed; errors carry the server's message) ──────────────────────────
  const addAccount = useCallback(({ accountName, type, bankName, accountNumber, ifsc, openingBalance, openingBalanceDate, notes, accountType }) =>
    once('addAccount', async () => {
      try {
        const res = await treasuryService.createAccount({
          accountName, type: type === 'cash' ? 'CASH' : (accountType || 'CURRENT'), bankName, accountNumber, ifsc,
          openingBalance, openingBalanceDate, notes,
        });
        await refresh({ silent: true });
        setSelectedAccountId(res.account.id);
        showToast(`Account "${res.account.accountName}" successfully created.`);
        return { success: true, account: res.account };
      } catch (err) { return fail(err, 'Could not create the account.'); }
    }), [once, refresh, showToast]);

  const addTransaction = useCallback(({ accountId, type, amount, date, category, referenceNumber, paymentMode, notes }) =>
    once('addTransaction', async () => {
      try {
        const res = await treasuryService.addReduceMoney({ accountId, type, amount, date, category, referenceNumber, paymentMode, notes });
        await afterChange();
        showToast(`${type === 'money_in' ? 'Money In' : 'Money Out'} of ₹${Number(amount).toLocaleString('en-IN')} recorded.`);
        return { success: true, entryNumber: res.entryNumber };
      } catch (err) { return fail(err, 'Could not record the transaction.'); }
    }), [once, afterChange, showToast]);

  const transferMoney = useCallback(({ fromAccountId, toAccountId, amount, date, referenceNumber, paymentMode, notes }) =>
    once('transfer', async () => {
      try {
        await treasuryService.transfer({ fromAccountId, toAccountId, amount, date, referenceNumber, paymentMode, notes });
        await afterChange();
        showToast(`Transferred ₹${Number(amount).toLocaleString('en-IN')}.`);
        return { success: true };
      } catch (err) { return fail(err, 'Could not transfer the funds.'); }
    }), [once, afterChange, showToast]);

  const linkUnlinkedTransaction = useCallback((id, { targetAccountId, category, referenceNumber, notes, force }) =>
    once('link:' + id, async () => {
      try {
        await treasuryService.linkUnlinked(id, { targetAccountId, category, referenceNumber, notes, force });
        await afterChange();
        showToast('Transaction allocated to the account.');
        return { success: true };
      } catch (err) { return fail(err, 'Could not allocate the transaction.'); }
    }), [once, afterChange, showToast]);

  const addStatementLine = useCallback((data) => once('stmt', async () => {
    try { const res = await treasuryService.addStatementLine(data); await afterChange(); showToast('Bank statement line added.'); return res; }
    catch (err) { return fail(err, 'Could not add the statement line.'); }
  }), [once, afterChange, showToast]);

  const ignoreUnlinked = useCallback((id, reason) => once('ign:' + id, async () => {
    try { await treasuryService.ignoreUnlinked(id, reason); await afterChange(); showToast('Transaction ignored.', 'info'); }
    catch (err) { fail(err, 'Could not ignore the transaction.'); }
  }), [once, afterChange, showToast]);

  const reverseEntry = useCallback((entryId, reason) => once('rev:' + entryId, async () => {
    try { await treasuryService.reverseEntry(entryId, reason); await afterChange(); showToast('Entry reversed with a correcting entry.'); }
    catch (err) { fail(err, 'Could not reverse the entry.'); }
  }), [once, afterChange, showToast]);

  const razorpayRefresh = useCallback(async () => {
    await Promise.all([refresh({ silent: true }), loadSettlements(), loadReconciliation(), loadGatewayPayments()]);
  }, [refresh, loadSettlements, loadReconciliation, loadGatewayPayments]);

  const syncSettlements = useCallback((range = {}) => once('sync', async () => {
    try { const res = await treasuryService.syncSettlements(range); await razorpayRefresh(); showToast(`Synced ${res.fetched} settlement(s) from Razorpay.`); return res; }
    catch (err) { return fail(err, 'Could not sync settlements from Razorpay.'); }
  }), [once, razorpayRefresh, showToast]);

  const postSettlement = useCallback((id, destinationAccountId) => once('post:' + id, async () => {
    try { const res = await treasuryService.postSettlement(id, destinationAccountId); await razorpayRefresh(); showToast('Settlement posted to the bank account.'); return res; }
    catch (err) { return fail(err, 'Could not post the settlement.'); }
  }), [once, razorpayRefresh, showToast]);

  const matchSettlement = useCallback((id, statementId) => once('match:' + id, async () => {
    try { const res = await treasuryService.matchSettlement(id, statementId); await razorpayRefresh(); showToast(`Reconciliation: ${res.status}.`); return res; }
    catch (err) { return fail(err, 'Could not match the settlement.'); }
  }), [once, razorpayRefresh, showToast]);

  const unmatchSettlement = useCallback((id) => once('unmatch:' + id, async () => {
    try { await treasuryService.unmatchSettlement(id); await razorpayRefresh(); showToast('Match removed.', 'info'); }
    catch (err) { fail(err, 'Could not remove the match.'); }
  }), [once, razorpayRefresh, showToast]);

  const autoReconcile = useCallback(() => once('auto', async () => {
    try { const res = await treasuryService.autoReconcile(); await razorpayRefresh(); showToast(`Auto-match: ${res.matched} matched, ${res.partial} need confirmation, ${res.discrepancies} discrepancies.`); return res; }
    catch (err) { return fail(err, 'Could not run reconciliation.'); }
  }), [once, razorpayRefresh, showToast]);

  const setSettlementAccount = useCallback((id) => once('setacc', async () => {
    try { await treasuryService.updateAccount(id, { isSettlementAccount: true }); await refresh({ silent: true }); showToast('Default settlement account updated.'); }
    catch (err) { fail(err, 'Could not set the settlement account.'); }
  }), [once, refresh, showToast]);

  const exportTransactions = useCallback(async (format = 'csv') => {
    try {
      await treasuryService.download('/treasury/export/transactions', { format, accountId: isRealAccountSelected ? selectedAccountId : undefined }, `treasury-transactions.${format === 'csv' ? 'csv' : 'xls'}`);
    } catch (err) { showToast(messageOf(err, 'Export failed.'), 'info'); }
  }, [isRealAccountSelected, selectedAccountId, showToast]);
  const exportSettlements = useCallback(async (format = 'csv') => {
    try { await treasuryService.download('/treasury/export/settlements', { format }, `razorpay-settlements.${format === 'csv' ? 'csv' : 'xls'}`); }
    catch (err) { showToast(messageOf(err, 'Export failed.'), 'info'); }
  }, [showToast]);

  const value = {
    accounts, cashAccounts, bankAccounts, clearingAccounts, feeAccounts,
    transactions, unlinkedTransactions, selectedAccountId, selectedAccount, isUnlinkedSelected, isRazorpaySelected,
    currentAccountTransactions, totalBalance, unlinkedTotal, unlinkedCount, summary, integrity, filter, setFilter,
    settlements, reconciliation, gatewayPayments, loading, loadError, toast,
    selectAccount, refresh, addAccount, addTransaction, transferMoney, linkUnlinkedTransaction, addStatementLine,
    ignoreUnlinked, reverseEntry, loadSettlements, loadReconciliation, loadGatewayPayments, razorpayRefresh,
    syncSettlements, postSettlement, matchSettlement, unmatchSettlement, autoReconcile, setSettlementAccount,
    exportTransactions, exportSettlements, showToast,
  };

  return <CashBankContext.Provider value={value}>{children}</CashBankContext.Provider>;
};

export const useCashBank = () => {
  const context = useContext(CashBankContext);
  if (!context) throw new Error('useCashBank must be used within a CashBankProvider');
  return context;
};

export default CashBankContext;

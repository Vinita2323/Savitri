import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_UNLINKED_TRANSACTIONS,
} from '../data/cashBankDemoData';
import { generateId, maskAccountNumber } from '../utils/cashBankUtils';

const STORAGE_KEY = 'savitri_cash_bank_data_v1';

const CashBankContext = createContext(null);

export const CashBankProvider = ({ children }) => {
  // 1. Initialize State from localStorage or default demo data
  const [accounts, setAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          return parsed.accounts;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored cash and bank data:', e);
    }
    return INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.transactions)) {
          return parsed.transactions;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored transactions:', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  const [unlinkedTransactions, setUnlinkedTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.unlinkedTransactions)) {
          return parsed.unlinkedTransactions;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored unlinked transactions:', e);
    }
    return INITIAL_UNLINKED_TRANSACTIONS;
  });

  // Selected account: can be an account ID or 'unlinked'
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    return 'acc_hdfc';
  });

  // Toast / notification feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // 2. Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      const payload = {
        accounts,
        transactions,
        unlinkedTransactions,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save cash and bank state to localStorage:', e);
    }
  }, [accounts, transactions, unlinkedTransactions]);

  // Total balance: aggregated across all cash & bank accounts
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  }, [accounts]);

  // Unlinked summary
  const unlinkedTotal = useMemo(() => {
    return unlinkedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  }, [unlinkedTransactions]);

  const unlinkedCount = unlinkedTransactions.length;

  // Currently selected account object
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'unlinked') return null;
    return accounts.find((acc) => acc.id === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  const isUnlinkedSelected = selectedAccountId === 'unlinked';

  // Transactions belonging to selected account, sorted date descending
  const currentAccountTransactions = useMemo(() => {
    if (isUnlinkedSelected || !selectedAccount) return [];
    return transactions
      .filter((tx) => tx.accountId === selectedAccount.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, selectedAccount, isUnlinkedSelected]);

  // Separate cash and bank accounts
  const cashAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.type === 'cash' || acc.isCash);
  }, [accounts]);

  const bankAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.type === 'bank' && !acc.isCash);
  }, [accounts]);

  // Select account handler
  const selectAccount = useCallback((id) => {
    setSelectedAccountId(id);
  }, []);

  // 3. Add New Account
  const addAccount = useCallback(
    ({ accountName, type, bankName, accountNumber, ifsc, openingBalance, openingBalanceDate, notes }) => {
      const cleanName = (accountName || '').trim();
      if (!cleanName) {
        throw new Error('Please provide a valid account name.');
      }

      const balanceNum = parseFloat(openingBalance) || 0;
      if (balanceNum < 0) {
        throw new Error('Opening balance cannot be negative.');
      }

      const isCash = type === 'cash';
      const cleanBankName = isCash ? '' : (bankName || '').trim();
      const cleanAccNum = isCash ? '' : (accountNumber || '').trim();

      const newId = generateId(isCash ? 'acc_cash' : 'acc_bank');
      const newAccount = {
        id: newId,
        accountName: cleanName,
        type: isCash ? 'cash' : 'bank',
        isCash,
        bankName: cleanBankName,
        accountNumber: cleanAccNum,
        maskedAccount: isCash ? 'Physical Cash' : maskAccountNumber(cleanAccNum),
        ifsc: isCash ? '' : (ifsc || '').trim().toUpperCase(),
        balance: balanceNum,
        openingBalance: balanceNum,
        openingBalanceDate: openingBalanceDate || new Date().toISOString().split('T')[0],
        notes: (notes || '').trim(),
        createdAt: new Date().toISOString(),
      };

      // If opening balance > 0, generate an initial opening balance ledger entry
      let initialTx = null;
      if (balanceNum > 0) {
        initialTx = {
          id: generateId('tx_open'),
          accountId: newId,
          date: openingBalanceDate || new Date().toISOString().split('T')[0],
          description: `Opening Balance — ${cleanName}`,
          category: 'Capital Infusion',
          type: 'money_in',
          amount: balanceNum,
          paymentMode: isCash ? 'Cash Receipt' : 'Bank Transfer',
          referenceNumber: 'OPEN-BAL',
          notes: 'Account ledger opening balance initialization',
          runningBalance: balanceNum,
        };
      }

      setAccounts((prev) => [...prev, newAccount]);
      if (initialTx) {
        setTransactions((prev) => [initialTx, ...prev]);
      }

      setSelectedAccountId(newId);
      showToast(`Account "${cleanName}" successfully created.`);
      return { success: true, account: newAccount };
    },
    [showToast]
  );

  // 4. Add / Reduce Money
  const addTransaction = useCallback(
    ({ accountId, type, amount, date, category, referenceNumber, paymentMode, notes }) => {
      const targetAcc = accounts.find((acc) => acc.id === accountId);
      if (!targetAcc) {
        throw new Error('Selected account not found.');
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Transaction amount must be greater than zero.');
      }

      if (!date) {
        throw new Error('Please select a transaction date.');
      }

      const currentBal = parseFloat(targetAcc.balance) || 0;
      let newBal = currentBal;

      if (type === 'money_in') {
        newBal = currentBal + numAmount;
      } else if (type === 'money_out') {
        if (numAmount > currentBal) {
          // Allow overdraft with notice or check
        }
        newBal = currentBal - numAmount;
      } else {
        throw new Error('Invalid transaction type.');
      }

      const newTx = {
        id: generateId('tx'),
        accountId,
        date,
        description: (notes || category || 'Ledger Entry').trim(),
        category: category || (type === 'money_in' ? 'Customer Receipt' : 'General Expense'),
        type,
        amount: numAmount,
        paymentMode: paymentMode || (targetAcc.isCash ? 'Cash Receipt' : 'NEFT/RTGS'),
        referenceNumber: (referenceNumber || '').trim(),
        notes: (notes || '').trim(),
        runningBalance: newBal,
      };

      // Update account balance
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, balance: newBal } : acc))
      );

      // Add to transactions list
      setTransactions((prev) => [newTx, ...prev]);

      const typeLabel = type === 'money_in' ? 'Money In' : 'Money Out';
      showToast(`${typeLabel} of ₹${numAmount.toLocaleString('en-IN')} recorded for ${targetAcc.accountName}.`);
      return { success: true, transaction: newTx };
    },
    [accounts, showToast]
  );

  // 5. Transfer Money
  const transferMoney = useCallback(
    ({ fromAccountId, toAccountId, amount, date, referenceNumber, paymentMode, notes }) => {
      if (fromAccountId === toAccountId) {
        throw new Error('Source and destination accounts must be different.');
      }

      const sourceAcc = accounts.find((acc) => acc.id === fromAccountId);
      const destAcc = accounts.find((acc) => acc.id === toAccountId);

      if (!sourceAcc || !destAcc) {
        throw new Error('Selected source or destination account not found.');
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Transfer amount must be greater than zero.');
      }

      if (numAmount > sourceAcc.balance) {
        throw new Error(
          `Insufficient funds in ${sourceAcc.accountName}. Available: ₹${sourceAcc.balance.toLocaleString('en-IN')}`
        );
      }

      if (!date) {
        throw new Error('Please specify a transfer date.');
      }

      const newSourceBal = sourceAcc.balance - numAmount;
      const newDestBal = destAcc.balance + numAmount;

      const transferRef = (referenceNumber || '').trim() || `TRF-${Date.now().toString().slice(-6)}`;
      const linkId = generateId('trf_pair');

      // Outward entry on Source Account
      const outTx = {
        id: generateId('tx_trf_out'),
        accountId: fromAccountId,
        date,
        description: `Transfer to ${destAcc.accountName}`,
        category: 'Internal Transfer',
        type: 'transfer',
        transferType: 'out',
        targetAccountId: toAccountId,
        targetAccountName: destAcc.accountName,
        linkedTransferId: linkId,
        amount: numAmount,
        paymentMode: paymentMode || (sourceAcc.isCash || destAcc.isCash ? 'Bank Transfer' : 'NEFT/RTGS'),
        referenceNumber: transferRef,
        notes: (notes || '').trim(),
        runningBalance: newSourceBal,
      };

      // Inward entry on Destination Account
      const inTx = {
        id: generateId('tx_trf_in'),
        accountId: toAccountId,
        date,
        description: `Transfer from ${sourceAcc.accountName}`,
        category: 'Internal Transfer',
        type: 'transfer',
        transferType: 'in',
        targetAccountId: fromAccountId,
        targetAccountName: sourceAcc.accountName,
        linkedTransferId: linkId,
        amount: numAmount,
        paymentMode: paymentMode || (sourceAcc.isCash || destAcc.isCash ? 'Bank Transfer' : 'NEFT/RTGS'),
        referenceNumber: transferRef,
        notes: (notes || '').trim(),
        runningBalance: newDestBal,
      };

      // Update both account balances
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === fromAccountId) return { ...acc, balance: newSourceBal };
          if (acc.id === toAccountId) return { ...acc, balance: newDestBal };
          return acc;
        })
      );

      // Add both entries to transaction ledger
      setTransactions((prev) => [outTx, inTx, ...prev]);

      showToast(
        `Transferred ₹${numAmount.toLocaleString('en-IN')} from ${sourceAcc.accountName} to ${destAcc.accountName}.`
      );
      return { success: true };
    },
    [accounts, showToast]
  );

  // 6. Link Unlinked Transaction
  const linkUnlinkedTransaction = useCallback(
    (unlinkedId, { targetAccountId, category, referenceNumber, notes }) => {
      const item = unlinkedTransactions.find((u) => u.id === unlinkedId);
      if (!item) {
        throw new Error('Unlinked transaction not found.');
      }

      const targetAcc = accounts.find((a) => a.id === targetAccountId);
      if (!targetAcc) {
        throw new Error('Please select a target account to link this transaction.');
      }

      const numAmount = parseFloat(item.amount) || 0;
      const newBal = (parseFloat(targetAcc.balance) || 0) + numAmount;

      const verifiedTx = {
        id: generateId('tx_linked'),
        accountId: targetAccountId,
        date: item.date,
        description: (notes || item.description).trim(),
        category: category || item.suggestedCategory || 'Customer Receipt',
        type: item.type || 'money_in',
        amount: numAmount,
        paymentMode: item.source?.includes('POS') ? 'Debit Card' : 'Bank Transfer',
        referenceNumber: (referenceNumber || item.referenceNumber || '').trim(),
        notes: (notes || `Reconciled from unlinked statement feed: ${item.source}`).trim(),
        runningBalance: newBal,
      };

      // Update target account balance
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === targetAccountId ? { ...acc, balance: newBal } : acc))
      );

      // Add to verified transactions
      setTransactions((prev) => [verifiedTx, ...prev]);

      // Remove from unlinked
      setUnlinkedTransactions((prev) => prev.filter((u) => u.id !== unlinkedId));

      showToast(
        `Transaction of ₹${numAmount.toLocaleString('en-IN')} reconciled and linked to ${targetAcc.accountName}.`
      );
      return { success: true };
    },
    [unlinkedTransactions, accounts, showToast]
  );

  // 7. Reset Demo Data
  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setUnlinkedTransactions(INITIAL_UNLINKED_TRANSACTIONS);
    setSelectedAccountId('acc_hdfc');
    showToast('Demo data successfully restored to default sample state.', 'info');
  }, [showToast]);

  const value = {
    accounts,
    cashAccounts,
    bankAccounts,
    transactions,
    unlinkedTransactions,
    selectedAccountId,
    selectedAccount,
    isUnlinkedSelected,
    currentAccountTransactions,
    totalBalance,
    unlinkedTotal,
    unlinkedCount,
    toast,
    selectAccount,
    addAccount,
    addTransaction,
    transferMoney,
    linkUnlinkedTransaction,
    resetDemoData,
    showToast,
  };

  return <CashBankContext.Provider value={value}>{children}</CashBankContext.Provider>;
};

export const useCashBank = () => {
  const context = useContext(CashBankContext);
  if (!context) {
    throw new Error('useCashBank must be used within a CashBankProvider');
  }
  return context;
};

export default CashBankContext;

/**
 * Utility functions for Cash and Bank Management
 */

/**
 * Format currency in Indian Rupees format (e.g. ₹1,25,000.00)
 */
export const formatINR = (amount, includeDecimals = true) => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const isNegative = numeric < 0;
  const absValue = Math.abs(numeric);

  const formatted = absValue.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
};

/**
 * Format date string into readable Indian enterprise date format (e.g. "28 Oct 2026")
 */
export const formatDate = (dateString, format = 'medium') => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);

    if (format === 'short') {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return String(dateString);
  }
};

/**
 * Mask bank account number, keeping only the last 4 digits visible
 */
export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '•••• ----';
  const clean = String(accountNumber).trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• ${last4}`;
};

/**
 * Generate a unique ID with custom prefix
 */
export const generateId = (prefix = 'cb') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Filter transactions by search text, date filter, and transaction type
 */
export const filterTransactions = (
  transactions = [],
  { search = '', dateFilter = 'all', customStart = '', customEnd = '', typeFilter = 'all' } = {}
) => {
  const now = new Date();
  const searchLower = search.trim().toLowerCase();

  return transactions.filter((tx) => {
    // 1. Transaction Type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'money_in' && tx.type !== 'money_in') return false;
      if (typeFilter === 'money_out' && tx.type !== 'money_out') return false;
      if (typeFilter === 'transfer' && tx.type !== 'transfer') return false;
    }

    // 2. Search term filter
    if (searchLower) {
      const matchDesc = (tx.description || '').toLowerCase().includes(searchLower);
      const matchRef = (tx.referenceNumber || '').toLowerCase().includes(searchLower);
      const matchCat = (tx.category || '').toLowerCase().includes(searchLower);
      const matchMode = (tx.paymentMode || '').toLowerCase().includes(searchLower);
      const matchTarget = (tx.targetAccountName || '').toLowerCase().includes(searchLower);
      if (!matchDesc && !matchRef && !matchCat && !matchMode && !matchTarget) {
        return false;
      }
    }

    // 3. Date range filter
    if (!tx.date) return true;
    const txDate = new Date(tx.date);
    if (isNaN(txDate.getTime())) return true;

    if (dateFilter === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return txDate >= past7;
    }

    if (dateFilter === '30days') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      return txDate >= past30;
    }

    if (dateFilter === 'this_month') {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === 'custom') {
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }

    return true;
  });
};

/**
 * Export transactions to CSV and trigger browser download
 */
export const exportTransactionsToCSV = (transactions = [], accountName = 'Account') => {
  if (!transactions.length) {
    alert('No transactions to export for the selected filter.');
    return;
  }

  const headers = [
    'Date',
    'Description',
    'Category / Reason',
    'Reference #',
    'Payment Mode',
    'Transaction Type',
    'Amount (₹)',
    'Running Balance (₹)',
    'Notes',
  ];

  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((t) => {
    let typeLabel = 'Money In';
    if (t.type === 'money_out') typeLabel = 'Money Out';
    if (t.type === 'transfer') typeLabel = 'Transfer';

    return [
      escapeCSV(formatDate(t.date, 'short')),
      escapeCSV(t.description || '-'),
      escapeCSV(t.category || '-'),
      escapeCSV(t.referenceNumber || '-'),
      escapeCSV(t.paymentMode || '-'),
      escapeCSV(typeLabel),
      escapeCSV(t.amount || 0),
      escapeCSV(t.runningBalance !== undefined ? t.runningBalance : '-'),
      escapeCSV(t.notes || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeAccountName = (accountName || 'All_Accounts').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Cash_Bank_${safeAccountName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

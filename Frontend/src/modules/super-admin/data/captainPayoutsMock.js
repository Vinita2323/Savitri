/**
 * Static demo captain payout totals for Super Admin.
 * Fictional records only — not live wallet or payout requests.
 */

const captain = (row) => row;

export const CAPTAIN_PAYOUTS = [
  captain({ id: 'CAP-014', name: 'Demo Captain One', phone: '+91 98XXX XX014', vehicle: 'Bike', city: 'Indore', deliveries: 486, totalPaid: 18600, pendingAmount: 2400, failedAmount: 0, lastPayoutDate: '2026-10-20' }),
  captain({ id: 'CAP-019', name: 'Demo Captain Two', phone: '+91 97XXX XX019', vehicle: 'Scooter', city: 'Bhopal', deliveries: 352, totalPaid: 14250, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-18' }),
  captain({ id: 'CAP-031', name: 'Demo Captain Three', phone: '+91 96XXX XX031', vehicle: 'Bike', city: 'Indore', deliveries: 410, totalPaid: 16800, pendingAmount: 1800, failedAmount: 600, lastPayoutDate: '2026-10-17' }),
  captain({ id: 'CAP-044', name: 'Demo Captain Four', phone: '+91 95XXX XX044', vehicle: 'Auto', city: 'Ujjain', deliveries: 228, totalPaid: 9800, pendingAmount: 0, failedAmount: 450, lastPayoutDate: '2026-10-15' }),
  captain({ id: 'CAP-052', name: 'Demo Captain Five', phone: '+91 94XXX XX052', vehicle: 'Bike', city: 'Dewas', deliveries: 301, totalPaid: 12400, pendingAmount: 3200, failedAmount: 0, lastPayoutDate: '2026-10-14' }),
  captain({ id: 'CAP-061', name: 'Demo Captain Six', phone: '+91 93XXX XX061', vehicle: 'Scooter', city: 'Indore', deliveries: 274, totalPaid: 11150, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-12' }),
  captain({ id: 'CAP-073', name: 'Demo Captain Seven', phone: '+91 92XXX XX073', vehicle: 'Bike', city: 'Bhopal', deliveries: 198, totalPaid: 8650, pendingAmount: 1500, failedAmount: 300, lastPayoutDate: '2026-10-10' }),
  captain({ id: 'CAP-088', name: 'Demo Captain Eight', phone: '+91 91XXX XX088', vehicle: 'Auto', city: 'Indore', deliveries: 336, totalPaid: 15300, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-09' }),
];

export const captainPayoutStatus = (row) => {
  if (row.pendingAmount > 0) return 'Pending';
  if (row.failedAmount > 0) return 'Failed';
  return 'Paid';
};

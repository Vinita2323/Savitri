/** Fictional demo customers. Phone numbers and emails are not real. */

const customer = (row) => row;

export const PAYMENT_CUSTOMERS = [
  customer({ id: 'CUS-101', brandSlug: 'auriva-bites', name: 'Demo Customer One', phone: '+91 98XXX XX101', email: 'demo.customer.one@example.com', registeredAt: '2025-04-12', accountStatus: 'Active', orderCount: 8 }),
  customer({ id: 'CUS-109', brandSlug: 'auriva-bites', name: 'Demo Customer Two', phone: '+91 97XXX XX109', email: 'demo.customer.two@example.com', registeredAt: '2025-05-03', accountStatus: 'Active', orderCount: 8 }),
  customer({ id: 'CUS-118', brandSlug: 'auriva-bites', name: 'Demo Customer Three', phone: '+91 96XXX XX118', email: 'demo.customer.three@example.com', registeredAt: '2025-06-18', accountStatus: 'Active', orderCount: 7 }),
  customer({ id: 'CUS-155', brandSlug: 'auriva-bites', name: 'Demo Customer Four', phone: '+91 95XXX XX155', email: 'demo.customer.four@example.com', registeredAt: '2025-07-09', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-204', brandSlug: 'auriva-bites', name: 'Demo Customer Five', phone: '+91 94XXX XX204', email: 'demo.customer.five@example.com', registeredAt: '2025-08-21', accountStatus: 'Inactive', orderCount: 6 }),
  customer({ id: 'CUS-231', brandSlug: 'auriva-bites', name: 'Demo Customer Six', phone: '+91 93XXX XX231', email: 'demo.customer.six@example.com', registeredAt: '2025-09-02', accountStatus: 'Active', orderCount: 6 }),

  customer({ id: 'CUS-301', brandSlug: 'quick-commerce', name: 'Demo Customer QC One', phone: '+91 92XXX XX301', email: 'demo.qc.one@example.com', registeredAt: '2025-03-14', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-308', brandSlug: 'quick-commerce', name: 'Demo Customer QC Two', phone: '+91 91XXX XX308', email: 'demo.qc.two@example.com', registeredAt: '2025-04-28', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-315', brandSlug: 'quick-commerce', name: 'Demo Customer QC Three', phone: '+91 90XXX XX315', email: 'demo.qc.three@example.com', registeredAt: '2025-06-11', accountStatus: 'Active', orderCount: 5 }),
  customer({ id: 'CUS-322', brandSlug: 'quick-commerce', name: 'Demo Customer QC Four', phone: '+91 89XXX XX322', email: 'demo.qc.four@example.com', registeredAt: '2025-08-01', accountStatus: 'Active', orderCount: 5 }),

  customer({ id: 'CUS-401', brandSlug: 'shippnex', name: 'Demo Customer SX One', phone: '+91 88XXX XX401', email: 'demo.sx.one@example.com', registeredAt: '2025-02-19', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-408', brandSlug: 'shippnex', name: 'Demo Customer SX Two', phone: '+91 87XXX XX408', email: 'demo.sx.two@example.com', registeredAt: '2025-05-22', accountStatus: 'Active', orderCount: 5 }),
  customer({ id: 'CUS-415', brandSlug: 'shippnex', name: 'Demo Customer SX Three', phone: '+91 86XXX XX415', email: 'demo.sx.three@example.com', registeredAt: '2025-07-30', accountStatus: 'Active', orderCount: 5 }),

  customer({ id: 'CUS-501', brandSlug: 'medcred', name: 'Demo Customer MC One', phone: '+91 85XXX XX501', email: 'demo.mc.one@example.com', registeredAt: '2025-01-16', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-508', brandSlug: 'medcred', name: 'Demo Customer MC Two', phone: '+91 84XXX XX508', email: 'demo.mc.two@example.com', registeredAt: '2025-03-08', accountStatus: 'Active', orderCount: 6 }),
  customer({ id: 'CUS-515', brandSlug: 'medcred', name: 'Demo Customer MC Three', phone: '+91 83XXX XX515', email: 'demo.mc.three@example.com', registeredAt: '2025-06-25', accountStatus: 'Active', orderCount: 5 }),
  customer({ id: 'CUS-522', brandSlug: 'medcred', name: 'Demo Customer MC Four', phone: '+91 82XXX XX522', email: 'demo.mc.four@example.com', registeredAt: '2025-09-12', accountStatus: 'Inactive', orderCount: 5 }),
];

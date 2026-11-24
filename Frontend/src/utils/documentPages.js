/** The "My Documents" pages in the sidebar. Each page shows (and adds) only the document types listed in `categories`. */
export const DOCUMENT_PAGES = [
  { slug: 'all', label: 'All Documents', title: 'All Documents', categories: null },
  { slug: 'identity', label: 'Identity Documents', title: 'Identity Documents', categories: ['Identity proof', 'Passport', 'Driving licence'], hint: 'Aadhaar, voter ID, passport, driving licence' },
  { slug: 'address', label: 'Address Proof', title: 'Address Proof', categories: ['Address proof'], hint: 'Utility bill, rent agreement, bank statement' },
  { slug: 'tax', label: 'Tax Documents', title: 'Tax Documents', categories: ['PAN / Tax'], hint: 'PAN card, GST, income tax papers' },
  { slug: 'bank', label: 'Bank Documents', title: 'Bank Documents', categories: ['Bank'], hint: 'Cancelled cheque, passbook, account details' },
  { slug: 'legal', label: 'Legal & Agreements', title: 'Legal & Agreements', categories: ['Legal / Agreement'], hint: 'Contracts, agreements, licences' },
  { slug: 'insurance', label: 'Insurance & Medical', title: 'Insurance & Medical', categories: ['Insurance / Medical'], hint: 'Health and life insurance, medical records' },
  { slug: 'emergency', label: 'Emergency Contacts', title: 'Emergency Contacts', categories: ['Emergency contact'], hint: 'Emergency contact details and papers' },
  { slug: 'other', label: 'Other Documents', title: 'Other Documents', categories: ['Other'], hint: 'Anything else you want to keep safe' },
];
export const documentPageBySlug = (slug) => DOCUMENT_PAGES.find((p) => p.slug === slug);

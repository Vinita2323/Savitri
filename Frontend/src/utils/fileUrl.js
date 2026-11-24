import { getBaseApiUrl } from '../services/api';

// Stored files are referenced either by a full https URL (cloud storage) or a server path such as /uploads/...
export const fileHref = (url) => {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const origin = getBaseApiUrl().replace(/\/api\/?$/, '');
  return `${origin}${u.startsWith('/') ? '' : '/'}${u}`;
};

export const INVOICE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
export const INVOICE_MAX_BYTES = 5 * 1024 * 1024;

// Returns an error message, or '' when the file can be attached.
export const checkInvoiceFile = (file) => {
  if (!file) return '';
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name || '')) return 'Only PDF, JPG, PNG or WEBP files can be attached.';
  if (file.size > INVOICE_MAX_BYTES) return 'The file is too large. The maximum size is 5 MB.';
  if (file.size === 0) return 'The selected file is empty.';
  return '';
};

export const formatFileSize = (bytes) => {
  const n = Number(bytes) || 0;
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
};

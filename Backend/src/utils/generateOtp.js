import crypto from 'crypto';

/**
 * Development mock OTP (never used in production unless MOCK_OTP is explicitly set).
 * Default: 123456 when NODE_ENV !== 'production'.
 */
export const getMockOtp = () => {
  if (process.env.DISABLE_MOCK_OTP === 'true') return null;
  if (process.env.MOCK_OTP && String(process.env.MOCK_OTP).trim()) {
    return String(process.env.MOCK_OTP).trim();
  }
  if (process.env.NODE_ENV !== 'production') {
    return '123456';
  }
  return null;
};

/**
 * Generates cryptographically secure 6-digit numeric OTP with 10-minute expiry.
 * In development (or when MOCK_OTP is set), returns the mock OTP instead.
 * @returns {{ otp: string, otpExpiry: Date }}
 */
export const generateOtp = () => {
  const mock = getMockOtp();
  const otp = mock || crypto.randomInt(100000, 1000000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  return { otp, otpExpiry };
};

/**
 * Returns true if submitted OTP matches stored OTP, or the configured mock OTP (non-production).
 */
export const isOtpMatch = (storedOtp, submittedOtp) => {
  const clean = String(submittedOtp ?? '').trim();
  if (!clean) return false;
  if (storedOtp && String(storedOtp).trim() === clean) return true;
  const mock = getMockOtp();
  return Boolean(mock && clean === mock);
};

export default generateOtp;

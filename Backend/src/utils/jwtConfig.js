/**
 * Central JWT configuration. There is intentionally NO fallback secret: a missing
 * secret must stop the server, never silently sign tokens with a well-known value.
 * The secret value is never logged.
 */
const KNOWN_INSECURE = new Set(['shippnex_secret', 'your_strong_random_jwt_secret_here', 'secret', 'changeme']);

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

/** Call once at startup (after dotenv). Throws when the secret is missing or a known placeholder. */
export const assertJwtConfigured = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new Error('FATAL: JWT_SECRET environment variable is required. Refusing to start.');
  }
  if (KNOWN_INSECURE.has(String(secret).trim())) {
    throw new Error('FATAL: JWT_SECRET is set to a known insecure/placeholder value. Refusing to start.');
  }
  if (String(secret).length < 32) {
    console.warn('[Security] JWT_SECRET is shorter than 32 characters; use a long random value.');
  }
};

export const JWT_ALGORITHMS = ['HS256'];

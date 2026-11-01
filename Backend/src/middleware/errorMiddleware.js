export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Developer-only diagnostics: stack traces are returned ONLY when explicitly enabled outside production.
// (Previously every non-production environment, including staging, exposed them.)
const exposeStack = () =>
  process.env.NODE_ENV !== 'production' && String(process.env.EXPOSE_ERROR_STACK || '').toLowerCase() === 'true';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);

  // Malformed ids / failed validation are client errors, not server faults.
  if (err.name === 'CastError') statusCode = 400;
  else if (err.name === 'ValidationError' && statusCode >= 500) statusCode = 400;

  if (statusCode >= 500) {
    // Full detail stays in the server log only.
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err);
  }

  let message = err.message;
  if (err.name === 'CastError') message = 'Invalid identifier supplied';
  else if (statusCode >= 500 && process.env.NODE_ENV === 'production') message = 'Internal server error';

  const body = { success: false, message };
  if (exposeStack()) body.stack = err.stack;
  res.status(statusCode).json(body);
};

'use strict';

/** Wrap an async route so thrown errors hit the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Convert a Zod parse into validated data or a 400. */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    err.status = 400;
    throw err;
  }
  return result.data;
}

/** Final error handler. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { wrap, validate, errorHandler };

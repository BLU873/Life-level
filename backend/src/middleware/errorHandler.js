const { ApiError } = require('../utils/apiError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError || err.isApiError) {
    return res.status(err.status || 500).json({
      success: false,
      error: { code: err.code || 'ERROR', message: err.message },
    });
  }

  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target || '');
    let code = 'CONFLICT';
    let message = 'A record with this value already exists.';
    if (target.includes('email')) {
      code = 'EMAIL_TAKEN';
      message = 'An account with this email already exists.';
    } else if (target.includes('username')) {
      code = 'USERNAME_TAKEN';
      message = 'This username is already taken.';
    }
    return res.status(409).json({ success: false, error: { code, message } });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  }

  console.error('[UnhandledError]', err);
  return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}

module.exports = { errorHandler };
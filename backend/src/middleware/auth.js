const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/apiError');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set. Make sure backend/.env contains a JWT_SECRET value.');
  process.exit(1);
}

const TOKEN_COOKIE = 'token';
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function authenticate(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) {
    return next(ApiError.unauthorized('AUTH_REQUIRED', 'Authentication required.'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) {
      return next(ApiError.unauthorized());
    }
    req.userId = decoded.userId;
    return next();
  } catch {
    return next(ApiError.unauthorized('INVALID_TOKEN', 'Your session is invalid or has expired.'));
  }
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function setTokenCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    // In development the frontend and backend are same-origin via the Vite
    // proxy (SameSite=Lax works). In production the frontend and API live on
    // different domains, so the cookie must be cross-site (SameSite=None + Secure).
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

function clearTokenCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

module.exports = {
  authenticate,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  TOKEN_COOKIE,
};
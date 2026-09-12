const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');

const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');
const {
  authenticate,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
} = require('../middleware/auth');
const { ApiError } = require('../utils/apiError');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const BCRYPT_ROUNDS = 10;

// Fields safe to return to the client. Password hashes are never selected.
const USER_SELECT = { id: true, username: true, email: true, createdAt: true };
const CHARACTER_SELECT = {
  id: true,
  level: true,
  totalXP: true,
  gold: true,
  intellect: true,
  strength: true,
  discipline: true,
  creativity: true,
  social: true,
  currentStreak: true,
  longestStreak: true,
  lastActiveDate: true,
};

// Emails are normalized consistently on signup and login.
function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

const signupValidation = [
  body('username')
    .exists().withMessage('Username is required.')
    .bail()
    .isString().withMessage('Username must be a string.')
    .bail()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.')
    .bail()
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores.'),
  body('email')
    .exists().withMessage('Email is required.')
    .bail()
    .isString().withMessage('Email must be a string.')
    .bail()
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .customSanitizer(normalizeEmail),
  body('password')
    .exists().withMessage('Password is required.')
    .bail()
    .isString().withMessage('Password must be a string.')
    .bail()
    .isLength({ min: 6, max: 72 }).withMessage('Password must be between 6 and 72 characters.'),
];

const loginValidation = [
  body('email')
    .exists().withMessage('Email is required.')
    .bail()
    .isString().withMessage('Email must be a string.')
    .bail()
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .customSanitizer(normalizeEmail),
  body('password')
    .exists().withMessage('Password is required.')
    .bail()
    .isString().withMessage('Password must be a string.')
    .bail()
    .notEmpty().withMessage('Password cannot be empty.'),
];

/**
 * POST /api/auth/signup
 * Validate, check duplicates, hash the password, then create User + Character
 * inside a single transaction. Ends with the auth cookie set.
 */
router.post(
  '/signup',
  signupValidation,
  validate,
  asyncHandler(async (req, res) => {
    const username = req.body.username.trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (emailTaken) {
      throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    }

    const usernameTaken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (usernameTaken) {
      throw ApiError.conflict('USERNAME_TAKEN', 'This username is already taken.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { user, character } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { username, email, passwordHash },
        select: USER_SELECT,
      });

      // Character defaults are defined in the schema (level 1, XP 0, gold 0,
      // attributes 1, streaks 0).
      const createdCharacter = await tx.character.create({
        data: { userId: createdUser.id, displayName: username },
        select: CHARACTER_SELECT,
      });

      return { user: createdUser, character: createdCharacter };
    });

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    return res.status(201).json({ success: true, data: { user, character } });
  })
);

/**
 * POST /api/auth/login
 * Verify credentials against the stored bcrypt hash, then set the auth cookie.
 */
router.post(
  '/login',
  loginValidation,
  validate,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const character = await prisma.character.findUnique({
      where: { userId: user.id },
      select: CHARACTER_SELECT,
    });

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    const safeUser = { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
    return res.status(200).json({ success: true, data: { user: safeUser, character } });
  })
);

/**
 * GET /api/auth/me
 * Return the authenticated user and their character summary.
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: USER_SELECT });
    if (!user) {
      throw ApiError.unauthorized();
    }

    const character = await prisma.character.findUnique({
      where: { userId: req.userId },
      select: CHARACTER_SELECT,
    });

    return res.status(200).json({ success: true, data: { user, character } });
  })
);

/**
 * POST /api/auth/logout
 * Clear the httpOnly cookie. No authentication required.
 */
router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  return res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

module.exports = router;
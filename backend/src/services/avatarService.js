const prisma = require('../lib/prisma');
const { AVATAR_PRESETS, AVATAR_UPLOAD_LIMIT, AVATAR_IMAGE_MAX_LENGTH } = require('../config/constants');
const { ApiError } = require('../utils/apiError');

/**
 * Character identity.
 *
 * `avatarKey` selects a preset (turtle/ronin/runner/scholar/creator) or
 * `custom` for an uploaded image. Uploaded images are stored as validated data
 * URIs (PNG/JPEG/WebP only); size checks run against the decoded bytes so base64
 * bloat cannot bypass the 2 MB limit.
 */

const PRESET_KEYS = AVATAR_PRESETS.map((p) => p.key);
const ALLOWED_MIME = { 'image/png': true, 'image/jpeg': true, 'image/webp': true };

async function setPreset(userId, key) {
  if (!PRESET_KEYS.includes(key)) {
    throw ApiError.badRequest('INVALID_AVATAR', `key must be one of: ${PRESET_KEYS.join(', ')}.`);
  }
  return prisma.character.update({
    where: { userId },
    data: { avatarKey: key, avatarImage: null },
    select: { avatarKey: true, avatarImage: true },
  });
}

async function setUpload(userId, image) {
  if (typeof image !== 'string' || image.length > AVATAR_IMAGE_MAX_LENGTH) {
    throw ApiError.badRequest('IMAGE_TOO_LARGE', 'Image is too large. Please use a smaller image (max 2 MB).');
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match || !ALLOWED_MIME[match[1]]) {
    throw ApiError.badRequest('INVALID_IMAGE', 'Image must be a PNG, JPEG or WebP data URI.');
  }
  const bytes = Math.floor((match[2].length * 3) / 4) - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  if (bytes > AVATAR_UPLOAD_LIMIT) {
    throw ApiError.badRequest('IMAGE_TOO_LARGE', 'Image is too large. Please use a smaller image (max 2 MB).');
  }

  return prisma.character.update({
    where: { userId },
    data: { avatarKey: 'custom', avatarImage: image },
    select: { avatarKey: true, avatarImage: true },
  });
}

async function clearAvatar(userId) {
  return prisma.character.update({
    where: { userId },
    data: { avatarKey: 'turtle', avatarImage: null },
    select: { avatarKey: true, avatarImage: true },
  });
}

module.exports = { setPreset, setUpload, clearAvatar, PRESET_KEYS };
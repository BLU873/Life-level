class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isApiError = true;
  }

  static badRequest(code, message) {
    return new ApiError(400, code, message);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required.') {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'You do not have access to this resource.') {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found.') {
    return new ApiError(404, code, message);
  }

  static conflict(code = 'CONFLICT', message = 'A record with this value already exists.') {
    return new ApiError(409, code, message);
  }

  static tooMany(code = 'RATE_LIMITED', message = 'Too many requests. Slow down and try again.') {
    return new ApiError(429, code, message);
  }
}

module.exports = { ApiError };
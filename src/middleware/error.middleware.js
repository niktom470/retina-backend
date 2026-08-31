/**
 * Centralized error-handling middleware.
 * Must be registered LAST in Express (after all routes).
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose duplicate key error (e.g. duplicate email) ──────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with that ${field} already exists.`;
  }

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // ── Mongoose bad ObjectId ─────────────────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Multer file size limit exceeded ──────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large. Maximum allowed size is 10 MB.';
  }

  // ── Multer unexpected field or missing file ───────────────────────────────
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = `Unexpected file field: "${err.field}". Use "file" as the field name.`;
  }

  // ── Multer fileFilter rejection (unsupported MIME type) ───────────────────
  // Multer 2.x surfaces fileFilter errors as plain Error objects.
  // Detect them by the message set in upload.middleware.js.
  if (
    err instanceof Error &&
    statusCode === 500 &&
    (err.message.includes('Unsupported file type') ||
      err.message.includes('Only JPEG and PNG'))
  ) {
    statusCode = 400;
    message = err.message;
  }

  // Suppress stack traces in production
  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { errorHandler };

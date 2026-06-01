// ─────────────────────────────────────────────
//  AppError — custom error with HTTP status code
// ─────────────────────────────────────────────
// Usage:  throw new AppError("Lead not found.", 404);
//
// The global error handler in app.js will catch this
// and send { success: false, message } with the
// correct HTTP status code.
// ─────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks it as a known/expected error
  }
}

export default AppError;

// ─────────────────────────────────────────────
//  asyncHandler — wraps async route handlers
// ─────────────────────────────────────────────
// Usage:  export const myHandler = asyncHandler(async (req, res) => { ... });
//
// If the async function throws, the error is
// automatically forwarded to Express's error handler.
// ─────────────────────────────────────────────

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

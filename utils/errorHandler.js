// Centralized Error and Exception Handling Utility
// Provides consistent logging and user-safe fallback responses

const DEFAULT_USER_MESSAGE = "I ran into a temporary issue while processing your request. Please try again in a moment.";

function redact(obj) {
  try {
    if (!obj) return obj;
    const clone = JSON.parse(JSON.stringify(obj));
    // Redact common sensitive fields if present
    const keysToRedact = ['apiKey', 'authorization', 'token', 'password'];
    for (const key of keysToRedact) {
      if (clone[key]) clone[key] = '***';
    }
    return clone;
  } catch (_) {
    return undefined;
  }
}

function logError(error, context = {}) {
  const safeContext = redact(context);
  const message = error?.message || String(error);
  const stack = error?.stack;
  console.error('❌ Error:', message);
  if (safeContext) console.error('🧭 Context:', safeContext);
  if (stack) console.error('🧵 Stack:', stack);
}

function buildUserSafeResponse(message = DEFAULT_USER_MESSAGE, options = []) {
  return {
    message,
    options,
  };
}

async function safeAsync(fn, { onErrorMessage, context } = {}) {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    return buildUserSafeResponse(onErrorMessage || DEFAULT_USER_MESSAGE);
  }
}

module.exports = {
  logError,
  buildUserSafeResponse,
  safeAsync,
};



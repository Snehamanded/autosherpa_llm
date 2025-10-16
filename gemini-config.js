// Gemini API Configuration
// Copy this to your .env file or set as environment variable

module.exports = {
  // Single key (optional)
  GEMINI_API_KEY: undefined,
  // Multiple keys for rotation (optional)
  GEMINI_API_KEYS: [
    'AIzaSyD527Lgd6vF2zkTULYl6GMvU9YFL2Y2Nvs',
    'AIzaSyBRRKBHmdNUsJQaRErMnQLJqDwMkMi6K6Y',
    'AIzaSyBv4kDQgR0d2XfbmiZm6gTiyGxtcy27dG4',
    'AIzaSyAFWNp4nafOY2q65pI9CYS9-uRM36JVJYA'
  ]
};

// To use this configuration:
// 1. Create a .env file in your project root
// 2. Add: GEMINI_API_KEYS=key1,key2,key3 (comma-separated) or GEMINI_API_KEY=single_key
// 3. Or set as environment variable: export GEMINI_API_KEYS="key1,key2,key3"

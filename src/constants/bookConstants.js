module.exports = {
  POPULAR_CACHE_TTL_MS: 5 * 60 * 1000,      // Popular books cache duration (5 minutes)
  DEFAULT_POPULAR_LIMIT: 6,                  // Default number of popular books to return
  MAX_POPULAR_LIMIT: 24,                     // Maximum number of popular books allowed
  DEFAULT_POPULAR_DAYS: 30,                  // Default days to look back for popular books
  MIN_POPULAR_DAYS: 1,                       // Minimum days to look back
  MAX_POPULAR_DAYS: 365,                     // Maximum days to look back (1 year)
  MS_PER_DAY: 24 * 60 * 60 * 1000,          // Milliseconds in one day
};

import rateLimit from "express-rate-limit";

// ============================================================================
// GLOBAL LIMITER (Applies to all routes unless overridden)
// Protects against basic DDoS and scraping
// ============================================================================
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Generous global limit, protects against aggressive scraping/DDoS
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// ============================================================================
// AUTH ROUTES LIMITER
// Very strict limit to prevent brute force login/OTP/password attacks
// ============================================================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per 15 mins
  message: {
    success: false,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// CHECKOUT & ORDER LIMITER
// Prevents spam ordering or cart checkout exploits
// ============================================================================
export const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 checkout/order requests per 5 mins
  message: {
    success: false,
    message: "Too many checkout requests from this IP, please wait a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// API READ LIMITER
// For browsing products, categories, etc. Generous limit but prevents extreme scraping.
// ============================================================================
export const apiReadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 500, // Limit each IP to 500 read requests per 10 mins
  message: {
    success: false,
    message: "Too many API requests from this IP, please slow down your browsing.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

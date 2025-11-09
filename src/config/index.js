require('dotenv').config();

module.exports = {
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/posed-server',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  
  // Static User Token for Public API
  staticUserToken: process.env.STATIC_USER_TOKEN,
  
  // User Token Expiry (in seconds) - Time window for token validation
  userTokenExpirySeconds: parseInt(process.env.USER_TOKEN_EXPIRY_SECONDS || '30'),
  
  // Upload Configuration
  uploadPath: process.env.UPLOAD_PATH || 'uploads/images',
  maxImageSizeBytes: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'), // 10 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  imagesArrayMaxDefault: parseInt(process.env.IMAGES_ARRAY_MAX_DEFAULT || '1000'),
  defaultImagesLimit: parseInt(process.env.DEFAULT_IMAGES_LIMIT || '100'),
  defaultImagesPage: 1,
  
  // Rate Limiting
  rateLimit: {
    // General API rate limiting
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false', // Default: enabled
    windowMs: (() => {
      const val = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
      // Validate: must be between 1 and 2147483647 (max safe integer for MemoryStore)
      if (isNaN(val) || val < 1 || val > 2147483647) {
        console.warn(`Invalid RATE_LIMIT_WINDOW_MS: ${process.env.RATE_LIMIT_WINDOW_MS}, using default 900000 (15 minutes)`);
        return 900000;
      }
      return val;
    })(),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window default
    
    // Increment API rate limiting
    incrementWindowMs: (() => {
      const val = parseInt(process.env.INCR_RATE_LIMIT_WINDOW_MS || '60000');
      if (isNaN(val) || val < 1 || val > 2147483647) {
        console.warn(`Invalid INCR_RATE_LIMIT_WINDOW_MS: ${process.env.INCR_RATE_LIMIT_WINDOW_MS}, using default 60000 (1 minute)`);
        return 60000;
      }
      return val;
    })(),
    incrementMaxRequests: parseInt(process.env.INCR_MAX_PER_MINUTE || '60'),
    
    // Login rate limiting
    loginWindowMs: (() => {
      const val = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000');
      if (isNaN(val) || val < 1 || val > 2147483647) {
        console.warn(`Invalid LOGIN_RATE_LIMIT_WINDOW_MS: ${process.env.LOGIN_RATE_LIMIT_WINDOW_MS}, using default 900000 (15 minutes)`);
        return 900000;
      }
      return val;
    })(),
    loginMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '5')
  },
  
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // Image Configuration
  autoIncrementUsageOnView: process.env.AUTO_INCREMENT_USAGE_ON_VIEW === 'true'
};


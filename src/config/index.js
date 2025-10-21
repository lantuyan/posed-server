require('dotenv').config();

module.exports = {
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/posed-server',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  
  // Static User Token for Public API
  staticUserToken: process.env.STATIC_USER_TOKEN,
  
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window default
    
    // Increment API rate limiting
    incrementWindowMs: parseInt(process.env.INCR_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute default
    incrementMaxRequests: parseInt(process.env.INCR_MAX_PER_MINUTE || '60'),
    
    // Login rate limiting
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
    loginMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '5')
  },
  
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // Image Configuration
  autoIncrementUsageOnView: process.env.AUTO_INCREMENT_USAGE_ON_VIEW === 'true'
};


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
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.INCR_MAX_PER_MINUTE || '60')
  },
  
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Image Configuration
  autoIncrementUsageOnView: process.env.AUTO_INCREMENT_USAGE_ON_VIEW === 'true'
};


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { createImageCacheMiddleware } = require('./middlewares/imageCache');
const imageCacheService = require('./services/imageCacheService');
const swaggerSpecs = require('./config/swagger');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const imageRoutes = require('./routes/imageRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Security middleware - skip for Swagger routes
const helmetMiddleware = helmet({
  // Allow assets (uploads) to be loaded from other origins (e.g. frontend dev server)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable COEP to avoid blocking cross-origin resources that don't send CORP
  crossOriginEmbedderPolicy: false
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    return next();
  }
  helmetMiddleware(req, res, next);
});

// SSL Pinning Information Endpoint (OPTIONAL)
// LƯU Ý QUAN TRỌNG: 
// - HPKP (Public-Key-Pins) headers đã bị DEPRECATED và không còn được hỗ trợ
// - SSL Pinning để chống Proxyman/MITM cần được implement ở CLIENT-SIDE (mobile app)
// - Client app nên HARDCODE pin hash trong app, không nên fetch từ server
// - Endpoint này chỉ để reference/documentation, không nên dùng trong production

// DISABLED: SSL pinning info endpoint
// Endpoint để lấy pin hash (optional - chỉ để reference)
// LƯU Ý: Nếu client app hardcode pin hash, endpoint này không cần thiết
// app.get('/api/ssl-pin-info', (req, res) => {
//   const sslPinHash = process.env.SSL_PIN_HASH;
//   const useHttps = process.env.USE_HTTPS === 'true';
//   
//   if (useHttps && sslPinHash) {
//     res.json({
//       success: true,
//       pinHash: sslPinHash,
//       algorithm: 'sha256',
//       format: 'base64',
//       note: '⚠️ LƯU Ý: Nên hardcode pin hash trong client app, không nên fetch từ server',
//       recommendation: 'Copy pin hash từ certs/pin-hash.txt và hardcode trong mobile app'
//     });
//   } else {
//     // Nếu không có trong .env, thử đọc từ file
//     const fs = require('fs');
//     const path = require('path');
//     const pinHashFile = path.join(process.cwd(), 'certs', 'pin-hash.txt');
//     
//     if (fs.existsSync(pinHashFile)) {
//       const pinHash = fs.readFileSync(pinHashFile, 'utf8').trim();
//       res.json({
//         success: true,
//         pinHash: pinHash,
//         algorithm: 'sha256',
//         format: 'base64',
//         source: 'certs/pin-hash.txt',
//         note: '⚠️ LƯU Ý: Nên hardcode pin hash trong client app, không nên fetch từ server',
//         recommendation: 'Copy pin hash trên và hardcode trong mobile app'
//       });
//     } else {
//       res.status(503).json({
//         success: false,
//         error: 'SSL pinning not configured',
//         note: 'Chạy: npm run extract-pin [certificate-path] để extract pin hash',
//         recommendation: 'Pin hash sẽ được lưu vào certs/pin-hash.txt để copy vào client app'
//       });
//     }
//   }
// });

// Anti-MITM Detection Middleware
// Phát hiện các dấu hiệu của MITM proxy (như Proxyman)
app.use((req, res, next) => {
  // Kiểm tra các headers đặc trưng của MITM proxy
  const suspiciousHeaders = [
    'x-forwarded-for',
    'via',
    'x-proxy-id',
    'x-proxy-connection'
  ];
  
  const hasSuspiciousHeaders = suspiciousHeaders.some(header => 
    req.get(header) && !req.get('X-Forwarded-Proto') // Nếu có X-Forwarded-Proto thì có thể là reverse proxy hợp lệ
  );
  
  // Kiểm tra User-Agent đáng ngờ
  const userAgent = req.get('User-Agent') || '';
  const suspiciousUserAgents = ['Proxyman', 'Charles', 'mitmproxy', 'Burp'];
  const hasSuspiciousUA = suspiciousUserAgents.some(ua => 
    userAgent.toLowerCase().includes(ua.toLowerCase())
  );
  
  // Log warning nếu phát hiện dấu hiệu MITM
  if (hasSuspiciousHeaders || hasSuspiciousUA) {
    logger.warn('Potential MITM proxy detected', {
      ip: req.ip,
      userAgent: userAgent,
      headers: suspiciousHeaders.filter(h => req.get(h)),
      path: req.path
    });
    
    // Có thể từ chối request hoặc chỉ log (tùy chọn)
    // return res.status(403).json({ success: false, error: 'Request blocked' });
  }
  
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting - Configurable via .env
if (config.rateLimit.enabled) {
  app.use(apiLimiter);
  logger.info('Rate limiting enabled', {
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests
  });
} else {
  logger.info('Rate limiting disabled');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), config.uploadPath);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Created uploads directory: ${uploadsDir}`);
}

// Create user submissions directory if it doesn't exist
const userUploadsDir = path.join(process.cwd(), config.userUploadPath);
if (!fs.existsSync(userUploadsDir)) {
  fs.mkdirSync(userUploadsDir, { recursive: true });
  logger.info(`Created user submissions directory: ${userUploadsDir}`);
}

logger.info(`Serving static files from: ${uploadsDir}`);
logger.info(`Static files accessible at: /uploads/*`);

// Image cache middleware - intercepts image requests before express.static
if (config.imageCache.enabled) {
  app.use('/uploads', createImageCacheMiddleware(uploadsDir));
  logger.info('Image caching enabled', {
    ttlSeconds: config.imageCache.ttlSeconds,
    maxSizeMB: config.imageCache.maxSizeBytes / (1024 * 1024)
  });
}

// Serve static files from uploads directory (fallback for non-cached files)
app.use('/uploads', express.static(uploadsDir, {
  index: false,
  dotfiles: 'ignore',
  setHeaders: (res) => {
    // Ensure browsers permit cross-origin image loads (avoid CORP/CORS blocks)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Add cache headers for browser caching
    res.setHeader('Cache-Control', `public, max-age=${config.imageCache.httpMaxAgeSeconds || 86400}`);
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Swagger documentation with HTTP headers
app.use('/api-docs', (req, res, next) => {
  // Remove security headers for Swagger
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  res.removeHeader('Strict-Transport-Security');
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pose Backend API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
  }
}));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/public', publicRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  imageCacheService.flush();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  imageCacheService.flush();
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = { app, connectDB };

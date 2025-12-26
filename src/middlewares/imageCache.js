const path = require('path');
const config = require('../config');
const imageCacheService = require('../services/imageCacheService');
const logger = require('../utils/logger');

/**
 * Create a middleware for serving cached images with proper HTTP headers
 * @param {string} uploadsBasePath - Base path for uploads directory
 */
const createImageCacheMiddleware = (uploadsBasePath) => {
  return async (req, res, next) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const filename = path.basename(req.path);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
    const ext = path.extname(filename).toLowerCase();

    // Not an image file, pass to next middleware
    if (!imageExtensions.includes(ext)) {
      return next();
    }

    try {
      // Construct full file path
      const relativePath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
      const filePath = path.join(uploadsBasePath, relativePath);

      // Try to get from cache or load
      const imageData = await imageCacheService.get(filename, filePath);

      if (!imageData) {
        // File not found, let express.static handle 404
        return next();
      }

      // Handle conditional requests (If-None-Match)
      if (config.imageCache.useEtag && req.headers['if-none-match'] === imageData.etag) {
        return res.status(304).end();
      }

      // Set response headers
      res.set({
        'Content-Type': imageData.mimeType,
        'Content-Length': imageData.size,
        'Cache-Control': `public, max-age=${config.imageCache.httpMaxAgeSeconds}`,
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*'
      });

      // Add ETag if enabled
      if (config.imageCache.useEtag) {
        res.set('ETag', imageData.etag);
      }

      // Add custom header to indicate cache status (useful for debugging)
      res.set('X-Cache', imageData.cached !== false ? 'HIT' : 'BYPASS');

      // Send the image buffer
      res.send(imageData.buffer);

    } catch (error) {
      logger.error('Error in image cache middleware', {
        path: req.path,
        error: error.message
      });
      next();
    }
  };
};

module.exports = {
  createImageCacheMiddleware
};

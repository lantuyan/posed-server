const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class ImageCacheService {
  constructor() {
    this.cache = null;
    this.currentSizeBytes = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    if (config.imageCache.enabled) {
      this.initialize();
    }
  }

  initialize() {
    this.cache = new NodeCache({
      stdTTL: config.imageCache.ttlSeconds,
      checkperiod: config.imageCache.checkPeriodSeconds,
      useClones: false, // Avoid cloning buffers for performance
      deleteOnExpire: true
    });

    // Track cache size on delete
    this.cache.on('del', (key, value) => {
      if (value && value.buffer) {
        this.currentSizeBytes -= value.buffer.length;
        this.stats.evictions++;
      }
    });

    // Track cache size on expired
    this.cache.on('expired', (key, value) => {
      if (value && value.buffer) {
        this.currentSizeBytes -= value.buffer.length;
      }
    });

    logger.info('Image cache initialized', {
      ttlSeconds: config.imageCache.ttlSeconds,
      maxSizeBytes: config.imageCache.maxSizeBytes
    });
  }

  /**
   * Generate cache key from filename
   */
  generateKey(filename) {
    return `img:${filename}`;
  }

  /**
   * Generate ETag from buffer content
   */
  generateEtag(buffer) {
    return `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
  }

  /**
   * Get cached image or load from filesystem
   * @param {string} filename - Image filename
   * @param {string} filePath - Full path to the image file
   * @returns {Promise<{buffer: Buffer, mimeType: string, etag: string, size: number, cached: boolean} | null>}
   */
  async get(filename, filePath) {
    if (!this.cache) {
      return this.loadFromDisk(filename, filePath);
    }

    const key = this.generateKey(filename);
    const cached = this.cache.get(key);

    if (cached) {
      this.stats.hits++;
      logger.debug('Image cache hit', { filename });
      return cached;
    }

    this.stats.misses++;

    // Load from disk and cache
    const imageData = await this.loadFromDisk(filename, filePath);
    if (imageData && imageData.cached) {
      this.set(filename, imageData);
    }

    return imageData;
  }

  /**
   * Load image from filesystem
   */
  async loadFromDisk(filename, filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);

      // Skip caching if file is too large
      if (stats.size > config.imageCache.maxFileSizeBytes) {
        logger.debug('Skipping cache for large file', {
          filename,
          size: stats.size,
          maxSize: config.imageCache.maxFileSizeBytes
        });
        // Still return the data, just don't cache it
        const buffer = fs.readFileSync(filePath);
        return {
          buffer,
          mimeType: this.getMimeType(filename),
          etag: this.generateEtag(buffer),
          size: stats.size,
          cached: false
        };
      }

      const buffer = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filename);
      const etag = this.generateEtag(buffer);

      return {
        buffer,
        mimeType,
        etag,
        size: stats.size,
        cached: true
      };
    } catch (error) {
      logger.error('Failed to load image from disk', { filename, error: error.message });
      return null;
    }
  }

  /**
   * Store image in cache with size management
   */
  set(filename, imageData) {
    if (!this.cache || !imageData.cached) {
      return false;
    }

    const key = this.generateKey(filename);
    const bufferSize = imageData.buffer.length;

    // Check if adding this would exceed max cache size
    while (this.currentSizeBytes + bufferSize > config.imageCache.maxSizeBytes) {
      // Evict oldest entries until we have space
      const keys = this.cache.keys();
      if (keys.length === 0) break;

      // Delete the oldest key (first in list)
      const oldestKey = keys[0];
      this.cache.del(oldestKey);
      logger.debug('Evicted image from cache to make room', { evictedKey: oldestKey });
    }

    // Only cache if we now have enough space
    if (this.currentSizeBytes + bufferSize <= config.imageCache.maxSizeBytes) {
      const success = this.cache.set(key, imageData);
      if (success) {
        this.currentSizeBytes += bufferSize;
        logger.debug('Image cached', { filename, size: bufferSize });
      }
      return success;
    }

    return false;
  }

  /**
   * Invalidate (delete) a cached image
   */
  invalidate(filename) {
    if (!this.cache) return false;

    const key = this.generateKey(filename);
    const deleted = this.cache.del(key);

    if (deleted > 0) {
      logger.info('Image cache invalidated', { filename });
    }

    return deleted > 0;
  }

  /**
   * Flush entire cache
   */
  flush() {
    if (!this.cache) return;

    this.cache.flushAll();
    this.currentSizeBytes = 0;
    logger.info('Image cache flushed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const nodeStats = this.cache ? this.cache.getStats() : {};
    return {
      ...this.stats,
      ...nodeStats,
      currentSizeBytes: this.currentSizeBytes,
      currentSizeMB: (this.currentSizeBytes / (1024 * 1024)).toFixed(2),
      maxSizeBytes: config.imageCache.maxSizeBytes,
      enabled: config.imageCache.enabled
    };
  }

  /**
   * Determine MIME type from filename extension
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
module.exports = new ImageCacheService();

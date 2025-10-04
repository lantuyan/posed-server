const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ImageService {
  /**
   * Get image metadata using sharp
   * @param {string} filePath - Path to the image file
   * @returns {Promise<{width: number, height: number, size: number, mimeType: string}>}
   */
  async getImageMetadata(filePath) {
    try {
      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Get image metadata using sharp
      const metadata = await sharp(filePath).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        size: fileSize,
        mimeType: metadata.format ? `image/${metadata.format}` : 'image/jpeg'
      };
    } catch (error) {
      logger.error('Failed to get image metadata', {
        filePath,
        error: error.message
      });
      throw new Error('Failed to process image metadata');
    }
  }

  /**
   * Validate image file
   * @param {string} filePath - Path to the image file
   * @returns {Promise<boolean>}
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.width > 0 && metadata.height > 0;
    } catch (error) {
      logger.error('Image validation failed', {
        filePath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete image file from filesystem
   * @param {string} filePath - Path to the image file
   * @returns {Promise<boolean>}
   */
  async deleteImageFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Image file deleted', { filePath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete image file', {
        filePath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate thumbnail (optional - for future use)
   * @param {string} filePath - Path to the original image
   * @param {string} thumbnailPath - Path for thumbnail
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @returns {Promise<boolean>}
   */
  async generateThumbnail(filePath, thumbnailPath, width = 300, height = 300) {
    try {
      await sharp(filePath)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      logger.info('Thumbnail generated', { thumbnailPath });
      return true;
    } catch (error) {
      logger.error('Failed to generate thumbnail', {
        filePath,
        thumbnailPath,
        error: error.message
      });
      return false;
    }
  }
}

module.exports = new ImageService();

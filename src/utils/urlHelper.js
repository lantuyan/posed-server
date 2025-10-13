const config = require('../config');

/**
 * Convert relative file path to full URL
 * @param {string} filePath - Relative file path (e.g., "uploads/images/filename.jpg")
 * @returns {string} - Full URL (e.g., "http://localhost:3000/uploads/images/filename.jpg")
 */
function getImageUrl(filePath) {
  if (!filePath) {
    return null;
  }
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  // Combine base URL with file path
  return `${config.baseUrl}/${cleanPath}`;
}

module.exports = {
  getImageUrl
};

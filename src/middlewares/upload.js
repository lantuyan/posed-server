const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: random UUID + original extension
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${ext}`;
    cb(null, filename);
  }
});

// File filter to check MIME types
const fileFilter = (req, file, cb) => {
  if (config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('Invalid file type attempted', {
      filename: file.originalname,
      mimetype: file.mimetype,
      ip: req.ip
    });
    cb(new Error(`Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.maxImageSizeBytes,
    files: 10 // Maximum 10 files per request
  }
});

// Middleware for single file upload
const uploadSingle = upload.single('image');

// Middleware for multiple files upload
const uploadMultiple = upload.array('images', 10);

// Middleware for category files upload (icon and thumbnail)
const uploadCategoryFiles = upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        maxSize: `${config.maxImageSizeBytes / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        maxFiles: 10
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name'
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next(err);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadCategoryFiles,
  handleUploadError
};

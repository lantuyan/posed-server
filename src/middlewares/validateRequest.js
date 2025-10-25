const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('Validation errors', {
      errors: errorMessages,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
  }
  next();
};

/**
 * Validation rules for admin login
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  handleValidationErrors
];

/**
 * Validation rules for category creation/update
 */
const validateCategory = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('status')
    .optional()
    .isBoolean()
    .withMessage('Status must be a boolean value'),
  
  handleValidationErrors
];

/**
 * Validation rules for category partial update (PATCH)
 */
const validateCategoryEdit = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('status')
    .optional()
    .isBoolean()
    .withMessage('Status must be a boolean value'),
  
  handleValidationErrors
];

/**
 * Validation rules for image metadata update
 */
const validateImageMetadata = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('categoryIds')
    .optional()
    .isArray()
    .withMessage('CategoryIds must be an array'),
  
  body('categoryIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each categoryId must be a valid MongoDB ObjectId'),
  
  body('status')
    .optional()
    .isBoolean()
    .withMessage('Status must be a boolean value'),
  
  handleValidationErrors
];

/**
 * Validation rules for increment API
 */
const validateIncrement = [
  body('incrementUsage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('incrementUsage must be a non-negative integer'),
  
  body('incrementFavorite')
    .optional()
    .isInt({ min: 0 })
    .withMessage('incrementFavorite must be a non-negative integer'),
  
  body()
    .custom((body) => {
      if (!body.incrementUsage && !body.incrementFavorite) {
        throw new Error('At least one increment value is required');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination query parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('imagesPage')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ImagesPage must be a positive integer'),
  
  query('imagesLimit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('ImagesLimit must be between 1 and 1000'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateCategory,
  validateCategoryEdit,
  validateImageMetadata,
  validateIncrement,
  validateObjectId,
  validatePagination
};


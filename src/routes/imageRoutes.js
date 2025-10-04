const express = require('express');
const router = express.Router();

const imageController = require('../controllers/imageController');
const { verifyAdminOrEditor, verifyStaticUser } = require('../middlewares/authJwt');
const { validateImageMetadata, validateObjectId, validatePagination } = require('../middlewares/validateRequest');
const { uploadMultiple, handleUploadError } = require('../middlewares/upload');

// Image routes

// POST /api/images - Upload images (admin/editor only)
router.post('/', 
  verifyAdminOrEditor,
  uploadMultiple,
  handleUploadError,
  imageController.uploadImages
);

// GET /api/images - Get all images with pagination and filters (public)
router.get('/', 
  verifyStaticUser, 
  validatePagination, 
  imageController.getImages
);

// GET /api/images/:id - Get image by ID (public)
router.get('/:id', 
  verifyStaticUser, 
  validateObjectId, 
  imageController.getImageById
);

// PUT /api/images/:id - Update image metadata (admin/editor only)
router.put('/:id', 
  verifyAdminOrEditor, 
  validateObjectId, 
  validateImageMetadata, 
  imageController.updateImage
);

// DELETE /api/images/:id - Soft delete image (admin/editor only)
router.delete('/:id', 
  verifyAdminOrEditor, 
  validateObjectId, 
  imageController.deleteImage
);

module.exports = router;

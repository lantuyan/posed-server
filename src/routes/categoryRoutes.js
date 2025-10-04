const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { verifyAdminOrEditor, verifyStaticUser } = require('../middlewares/authJwt');
const { validateCategory, validateObjectId, validatePagination } = require('../middlewares/validateRequest');

// Category routes

// POST /api/categories - Create category (admin/editor only)
router.post('/', 
  verifyAdminOrEditor, 
  validateCategory, 
  categoryController.createCategory
);

// GET /api/categories - Get all categories (public)
router.get('/', 
  verifyStaticUser, 
  validatePagination, 
  categoryController.getCategories
);

// GET /api/categories/:id - Get category by ID with images (public)
router.get('/:id', 
  verifyStaticUser, 
  validateObjectId, 
  validatePagination, 
  categoryController.getCategoryById
);

// PUT /api/categories/:id - Update category (admin/editor only)
router.put('/:id', 
  verifyAdminOrEditor, 
  validateObjectId, 
  validateCategory, 
  categoryController.updateCategory
);

// DELETE /api/categories/:id - Soft delete category (admin/editor only)
router.delete('/:id', 
  verifyAdminOrEditor, 
  validateObjectId, 
  categoryController.deleteCategory
);

module.exports = router;

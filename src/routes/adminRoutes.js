const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const imageController = require('../controllers/imageController');
const { verifyAdminOrEditor, verifyStaticUser, requireAdmin } = require('../middlewares/authJwt');
const { 
  validateLogin, 
  validatePagination, 
  validateObjectId, 
  validateSubmissionList, 
  validateSubmissionUpdate,
  validateCategory,
  validateCategoryEdit,
  validateImageMetadata
} = require('../middlewares/validateRequest');
const {
  uploadCategoryFiles,
  uploadMultiple,
  uploadSingle,
  handleUploadError
} = require('../middlewares/upload');
const userSubmissionAdminController = require('../controllers/userSubmissionAdminController');
const { loginLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin/Editor login
 *     description: Authenticate admin or editor user and return JWT token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, validateLogin, authController.login);

/**
 * @swagger
 * /api/admin/test-admin:
 *   get:
 *     summary: Test admin authentication
 *     description: Test endpoint to verify admin/editor JWT authentication
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Admin authentication successful"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DISABLED: Test admin endpoint
// router.get('/test-admin', verifyAdminOrEditor, authController.testAdminAuth);

/**
 * @swagger
 * /api/admin/test-public:
 *   get:
 *     summary: Test public authentication
 *     description: Test endpoint to verify static token authentication
 *     tags: [Authentication]
 *     security:
 *       - StaticTokenAuth: []
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Static token authentication successful"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DISABLED: Test public endpoint
// router.get('/test-public', verifyStaticUser, authController.testStaticAuth);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories (admin)
 *     description: Retrieve paginated list of categories using admin authentication.
 *     tags: [Admin - Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by status (default shows active categories)
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/categories',
  verifyAdminOrEditor,
  validatePagination,
  categoryController.getCategories
);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category (admin)
 *     description: Same payload as public category creation but scoped under /admin with JWT auth.
 *     tags: [Admin - Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/categories',
  verifyAdminOrEditor,
  uploadCategoryFiles,
  handleUploadError,
  validateCategory,
  categoryController.createCategory
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category (admin)
 *     description: Full update for the specified category ID.
 *     tags: [Admin - Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error or invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.put('/categories/:id',
  verifyAdminOrEditor,
  validateObjectId,
  uploadCategoryFiles,
  handleUploadError,
  validateCategory,
  categoryController.updateCategory
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   patch:
 *     summary: Partially update category (admin)
 *     description: Partial update for the specified category ID.
 *     tags: [Admin - Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CategoryEditRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error or invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.patch('/categories/:id',
  verifyAdminOrEditor,
  validateObjectId,
  uploadCategoryFiles,
  handleUploadError,
  validateCategoryEdit,
  categoryController.editCategory
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category (admin)
 *     description: Soft delete the specified category.
 *     tags: [Admin - Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete('/categories/:id',
  verifyAdminOrEditor,
  validateObjectId,
  categoryController.deleteCategory
);

/**
 * @swagger
 * /api/admin/images:
 *   get:
 *     summary: Get all images (admin)
 *     description: Retrieve paginated list of images using admin authentication.
 *     tags: [Admin - Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and description
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *         description: Sort field and order (field:direction)
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/images',
  verifyAdminOrEditor,
  validatePagination,
  imageController.getImages
);

/**
 * @swagger
 * /api/admin/images:
 *   post:
 *     summary: Upload images (admin)
 *     description: Upload one or multiple images with metadata under the admin namespace.
 *     tags: [Admin - Images]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ImageUploadRequest'
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/images',
  verifyAdminOrEditor,
  uploadMultiple,
  handleUploadError,
  imageController.uploadImages
);

/**
 * @swagger
 * /api/admin/images/{id}:
 *   put:
 *     summary: Update image metadata (admin)
 *     description: Update metadata for a single image and optionally replace the stored file.
 *     tags: [Admin - Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImageMetadataRequest'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: boolean
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional new image file to replace existing
 *     responses:
 *       200:
 *         description: Image updated successfully
 *       400:
 *         description: Validation error or invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.put('/images/:id',
  verifyAdminOrEditor,
  validateObjectId,
  uploadSingle,
  handleUploadError,
  validateImageMetadata,
  imageController.updateImage
);

/**
 * @swagger
 * /api/admin/images/{id}:
 *   delete:
 *     summary: Delete image (admin)
 *     description: Permanently delete an image record and its stored file.
 *     tags: [Admin - Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.delete('/images/:id',
  verifyAdminOrEditor,
  validateObjectId,
  imageController.deleteImage
);

/**
 * @swagger
 * /api/admin/user-submissions:
 *   get:
 *     summary: List user image submissions
 *     description: Retrieve paginated list of user submitted images pending or processed for review (admin only).
 *     tags: [Admin - User Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by submission status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by original file name or review notes
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *           description: Sort field and direction (createdAt, updatedAt, status, reviewedAt)
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserSubmission'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user-submissions',
  verifyAdminOrEditor,
  requireAdmin,
  validateSubmissionList,
  validatePagination,
  userSubmissionAdminController.listUserSubmissions
);

/**
 * @swagger
 * /api/admin/user-submissions/{id}:
 *   put:
 *     summary: Update user submission review status
 *     description: Approve or reject a user submitted image and optionally promote it to the main image catalog.
 *     tags: [Admin - User Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required when approving to assign categories
 *               reviewNotes:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 submission:
 *                   $ref: '#/components/schemas/UserSubmission'
 *                 createdImage:
 *                   $ref: '#/components/schemas/Image'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Submission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/user-submissions/:id',
  verifyAdminOrEditor,
  requireAdmin,
  validateObjectId,
  validateSubmissionUpdate,
  userSubmissionAdminController.updateUserSubmission
);

module.exports = router;

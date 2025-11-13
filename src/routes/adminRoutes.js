const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyAdminOrEditor, verifyStaticUser, requireAdmin } = require('../middlewares/authJwt');
const { validateLogin, validatePagination, validateObjectId, validateSubmissionList, validateSubmissionUpdate } = require('../middlewares/validateRequest');
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
router.get('/test-admin', verifyAdminOrEditor, authController.testAdminAuth);

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
router.get('/test-public', verifyStaticUser, authController.testStaticAuth);

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


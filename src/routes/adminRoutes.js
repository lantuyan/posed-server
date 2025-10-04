const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyAdminOrEditor, verifyStaticUser } = require('../middlewares/authJwt');
const { validateLogin } = require('../middlewares/validateRequest');
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

module.exports = router;


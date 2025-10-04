const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyAdminOrEditor, verifyStaticUser } = require('../middlewares/authJwt');
const { validateLogin } = require('../middlewares/validateRequest');
const { loginLimiter } = require('../middlewares/rateLimiter');

// Admin login route
router.post('/login', loginLimiter, validateLogin, authController.login);

// Test routes for authentication
router.get('/test-admin', verifyAdminOrEditor, authController.testAdminAuth);
router.get('/test-public', verifyStaticUser, authController.testStaticAuth);

module.exports = router;


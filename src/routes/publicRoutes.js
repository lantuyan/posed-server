const express = require('express');
const router = express.Router();

const Image = require('../models/Image');
const userSubmissionController = require('../controllers/userSubmissionController');
const { verifyStaticUser } = require('../middlewares/authJwt');
const { validateObjectId, validateIncrement } = require('../middlewares/validateRequest');
const { incrementLimiter } = require('../middlewares/rateLimiter');
const { uploadUserSingle, handleUploadError } = require('../middlewares/upload');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/public/images/upload:
 *   post:
 *     summary: Submit image for review
 *     description: Upload a single image that will be stored separately for admin review and categorization.
 *     tags: [Public]
 *     security:
 *       - StaticTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Single image file to upload
 *     responses:
 *       201:
 *         description: Image submitted successfully
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
 *                   example: "Image submitted successfully and pending review"
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// POST /api/public/images/upload - User submission upload (single file)
router.post('/images/upload',
  verifyStaticUser,
  uploadUserSingle,
  handleUploadError,
  userSubmissionController.uploadUserImage
);

/**
 * @swagger
 * /api/public/images/{id}/increment:
 *   post:
 *     summary: Increment image counters
 *     description: Atomically increment image usage and/or favorite counters (public with static token)
 *     tags: [Public]
 *     security:
 *       - StaticTokenAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncrementRequest'
 *     responses:
 *       200:
 *         description: Counters incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncrementResponse'
 *       400:
 *         description: Invalid request or image ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * Increment image counters (usage/favorite)
 */
const incrementImageCounters = async (req, res) => {
  try {
    const { id } = req.params;
    const { incrementUsage = 0, incrementFavorite = 0 } = req.body;

    // Validate that at least one increment is provided
    if (incrementUsage <= 0 && incrementFavorite <= 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one increment value must be greater than 0'
      });
    }

    // Find image
    const image = await Image.findById(id);
    if (!image || !image.status) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Atomic increment using MongoDB $inc
    const updateFields = {};
    if (incrementUsage > 0) updateFields.countUsage = incrementUsage;
    if (incrementFavorite > 0) updateFields.countFavorite = incrementFavorite;

    const updatedImage = await Image.findByIdAndUpdate(
      id,
      { $inc: updateFields },
      { new: true, select: 'countUsage countFavorite' }
    );

    // Log the increment action for audit
    logger.info('Image counters incremented', {
      imageId: id,
      incrementUsage,
      incrementFavorite,
      newCountUsage: updatedImage.countUsage,
      newCountFavorite: updatedImage.countFavorite,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      image: {
        id: updatedImage._id,
        countUsage: updatedImage.countUsage,
        countFavorite: updatedImage.countFavorite
      }
    });
  } catch (error) {
    logger.error('Failed to increment image counters', {
      imageId: req.params.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update counters'
    });
  }
};

// POST /api/public/images/:id/increment - Increment image counters (public with static token)
router.post('/images/:id/increment',
  verifyStaticUser,
  incrementLimiter,
  validateObjectId,
  validateIncrement,
  incrementImageCounters
);

module.exports = router;

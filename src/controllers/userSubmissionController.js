const UserImageSubmission = require('../models/UserImageSubmission');
const imageService = require('../services/imageService');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Handle user image upload (single file)
 */
const uploadUserImage = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  try {
    const metadata = await imageService.getImageMetadata(file.path);

    const submission = new UserImageSubmission({
      originalFileName: file.originalname,
      filePath: file.path,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
      submissionMeta: {
        tokenTime: req.publicAuth?.tokenTime,
        tokenTimeString: req.publicAuth?.tokenTimeString,
        timeDiffSeconds: req.publicAuth?.timeDiffSeconds,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await submission.save();

    logger.info('User image submission stored', {
      submissionId: submission._id,
      fileName: submission.fileName,
      size: submission.size,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Image submitted successfully and pending review',
      submission: {
        id: submission._id,
        status: submission.status,
        createdAt: submission.createdAt
      }
    });
  } catch (error) {
    logger.error('Failed to process user submission', {
      filename: file.filename,
      error: error.message,
      ip: req.ip
    });

    await imageService.deleteImageFile(file.path);

    return res.status(500).json({
      success: false,
      error: 'Failed to process uploaded image'
    });
  }
});

module.exports = {
  uploadUserImage
};


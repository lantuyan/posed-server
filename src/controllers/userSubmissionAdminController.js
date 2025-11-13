const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const UserImageSubmission = require('../models/UserImageSubmission');
const Category = require('../models/Category');
const Image = require('../models/Image');
const config = require('../config');
const imageService = require('../services/imageService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { getImageUrl } = require('../utils/urlHelper');
const logger = require('../utils/logger');

const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * Build absolute path from stored relative/absolute path
 * @param {string} storedPath
 * @returns {string}
 */
const resolveStoragePath = (storedPath) => {
  if (!storedPath) {
    return '';
  }

  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }

  return path.join(process.cwd(), storedPath);
};

/**
 * List user image submissions with filters and pagination
 */
const listUserSubmissions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const status = req.query.status;
  const search = req.query.search;
  const sort = req.query.sort || 'createdAt:desc';

  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { originalFileName: { $regex: search, $options: 'i' } },
      { reviewNotes: { $regex: search, $options: 'i' } }
    ];
  }

  const [sortField, sortOrderRaw] = sort.split(':');
  const sortOrder = sortOrderRaw === 'asc' ? 1 : -1;
  const sortObj = { [sortField]: sortOrder };

  const totalItems = await UserImageSubmission.countDocuments(query);
  const submissions = await UserImageSubmission.find(query)
    .populate('assignedCategoryIds', 'title')
    .populate('reviewedBy', 'username role')
    .populate('linkedImageId', 'title filePath status')
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    success: true,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    items: submissions.map((submission) => ({
      id: submission.id,
      originalFileName: submission.originalFileName,
      fileName: submission.fileName,
      filePath: submission.filePath,
      fileUrl: getImageUrl(submission.filePath),
      mimeType: submission.mimeType,
      size: submission.size,
      width: submission.width,
      height: submission.height,
      status: submission.status,
      assignedCategories: submission.assignedCategoryIds.map((cat) => ({
        id: cat.id,
        title: cat.title
      })),
      reviewNotes: submission.reviewNotes,
      reviewedBy: submission.reviewedBy ? {
        id: submission.reviewedBy.id,
        username: submission.reviewedBy.username,
        role: submission.reviewedBy.role
      } : null,
      reviewedAt: submission.reviewedAt,
      linkedImageId: submission.linkedImageId ? submission.linkedImageId.id : null,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      submissionMeta: submission.submissionMeta
    }))
  });
});

/**
 * Approve or reject a user submission
 */
const updateUserSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, categoryIds = [], reviewNotes, title, description } = req.body;

  if (!SUBMISSION_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value'
    });
  }

  const submission = await UserImageSubmission.findById(id);
  if (!submission) {
    return res.status(404).json({
      success: false,
      error: 'Submission not found'
    });
  }

  const updatePayload = {
    status,
    reviewedAt: new Date()
  };

  if (reviewNotes !== undefined) {
    updatePayload.reviewNotes = reviewNotes;
  }

  if (req.user?.userId) {
    updatePayload.reviewedBy = new mongoose.Types.ObjectId(req.user.userId);
  }

  let resultingImage = null;

  if (status === 'approved') {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'categoryIds is required when approving submissions'
      });
    }

    const normalizedCategoryIds = [...new Set(categoryIds.map((idValue) => idValue.toString()))];

    const categories = await Category.find({
      _id: { $in: normalizedCategoryIds },
      status: true
    });

    if (categories.length !== normalizedCategoryIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more categoryIds are invalid or inactive'
      });
    }

    const uploadsDir = path.join(process.cwd(), config.uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sourcePath = resolveStoragePath(submission.filePath);
    if (!fs.existsSync(sourcePath)) {
      logger.error('Submission file missing on disk', {
        submissionId: id,
        sourcePath
      });
      return res.status(500).json({
        success: false,
        error: 'Submission file is missing and cannot be processed'
      });
    }

    let targetFileName = submission.fileName;
    let targetRelativePath = submission.filePath;
    let targetAbsolutePath = resolveStoragePath(targetRelativePath);

    const isAlreadyInLibrary = targetRelativePath.startsWith(config.uploadPath);
    if (!isAlreadyInLibrary) {
      targetRelativePath = path.join(config.uploadPath, targetFileName);
      targetAbsolutePath = resolveStoragePath(targetRelativePath);

      while (fs.existsSync(targetAbsolutePath)) {
        const ext = path.extname(targetFileName);
        const nameWithoutExt = path.basename(targetFileName, ext);
        targetFileName = `${nameWithoutExt}-${Date.now()}${ext}`;
        targetRelativePath = path.join(config.uploadPath, targetFileName);
        targetAbsolutePath = resolveStoragePath(targetRelativePath);
      }

      try {
        fs.renameSync(sourcePath, targetAbsolutePath);
      } catch (error) {
        logger.error('Failed to move approved submission file', {
          submissionId: id,
          sourcePath,
          targetAbsolutePath,
          error: error.message
        });

        return res.status(500).json({
          success: false,
          error: 'Failed to move file to image storage'
        });
      }
    }

    let metadata = {
      size: submission.size,
      width: submission.width,
      height: submission.height
    };

    try {
      const refreshedMetadata = await imageService.getImageMetadata(targetAbsolutePath);
      metadata = refreshedMetadata;
    } catch (error) {
      logger.warn('Unable to refresh metadata for approved submission', {
        submissionId: id,
        error: error.message
      });
    }

    let imageDocument = null;
    if (submission.linkedImageId) {
      imageDocument = await Image.findById(submission.linkedImageId);
    }

    if (!imageDocument) {
      imageDocument = new Image({
        title: title || submission.originalFileName,
        description: description || '',
        filePath: targetRelativePath,
        fileName: targetFileName,
        mimeType: submission.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        categoryIds: normalizedCategoryIds,
        uploaderId: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        status: true,
        countUsage: 0,
        countFavorite: 0
      });
    } else {
      if (title !== undefined) {
        imageDocument.title = title;
      }
      if (description !== undefined) {
        imageDocument.description = description;
      }
      imageDocument.filePath = targetRelativePath;
      imageDocument.fileName = targetFileName;
      imageDocument.mimeType = submission.mimeType;
      imageDocument.size = metadata.size;
      imageDocument.width = metadata.width;
      imageDocument.height = metadata.height;
      imageDocument.categoryIds = normalizedCategoryIds;
      imageDocument.status = true;
      if (req.user?.userId) {
        imageDocument.uploaderId = new mongoose.Types.ObjectId(req.user.userId);
      }
    }

    await imageDocument.save();
    resultingImage = imageDocument;

    updatePayload.assignedCategoryIds = normalizedCategoryIds;
    updatePayload.linkedImageId = imageDocument._id;
    updatePayload.filePath = targetRelativePath;
    updatePayload.fileName = targetFileName;
  } else {
    updatePayload.assignedCategoryIds = [];
    updatePayload.linkedImageId = null;

    if (submission.linkedImageId) {
      await Image.findByIdAndUpdate(submission.linkedImageId, { status: false });
    }
  }

  submission.set(updatePayload);
  await submission.save();

  logger.info('User submission updated', {
    submissionId: submission._id,
    status: submission.status,
    reviewer: req.user?.userId
  });

  res.json({
    success: true,
    submission: {
      id: submission.id,
      status: submission.status,
      reviewNotes: submission.reviewNotes,
      assignedCategoryIds: submission.assignedCategoryIds,
      linkedImageId: submission.linkedImageId,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
      fileUrl: getImageUrl(submission.filePath)
    },
    createdImage: resultingImage ? {
      id: resultingImage.id,
      title: resultingImage.title,
      fileUrl: getImageUrl(resultingImage.filePath),
      categoryIds: resultingImage.categoryIds
    } : null
  });
});

module.exports = {
  listUserSubmissions,
  updateUserSubmission
};


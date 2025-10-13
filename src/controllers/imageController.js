const Image = require('../models/Image');
const Category = require('../models/Category');
const imageService = require('../services/imageService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validateImageMetadata, validateObjectId, validatePagination } = require('../middlewares/validateRequest');
const logger = require('../utils/logger');
const config = require('../config');
const { getImageUrl } = require('../utils/urlHelper');

/**
 * Upload images
 */
const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files;
  const { title, description, categoryIds } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded'
    });
  }

  // Validate categoryIds if provided
  if (categoryIds) {
    const categoryIdsArray = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
    const validCategories = await Category.find({
      _id: { $in: categoryIdsArray },
      status: true
    });

    if (validCategories.length !== categoryIdsArray.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more category IDs are invalid'
      });
    }
  }

  const uploadedImages = [];

  // Process each uploaded file
  for (const file of files) {
    try {
      // Get image metadata
      const metadata = await imageService.getImageMetadata(file.path);

      // Create image document
      const image = new Image({
        title: title || file.originalname,
        description: description || '',
        filePath: file.path,
        fileName: file.filename,
        mimeType: file.mimetype,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        categoryIds: categoryIds ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]) : [],
        uploaderId: req.user?.userId,
        status: true,
        countUsage: 0,
        countFavorite: 0
      });

      await image.save();

      uploadedImages.push({
        id: image._id,
        title: image.title,
        description: image.description,
        fileName: image.fileName,
        filePath: getImageUrl(image.filePath),
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        categoryIds: image.categoryIds,
        countUsage: image.countUsage,
        countFavorite: image.countFavorite,
        status: image.status,
        createdAt: image.createdAt
      });

      logger.info('Image uploaded successfully', {
        imageId: image._id,
        fileName: image.fileName,
        size: image.size,
        userId: req.user?.userId
      });
    } catch (error) {
      logger.error('Failed to process uploaded file', {
        filename: file.filename,
        error: error.message,
        userId: req.user?.userId
      });

      // Clean up file if processing failed
      await imageService.deleteImageFile(file.path);
    }
  }

  if (uploadedImages.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No images were successfully processed'
    });
  }

  res.status(201).json({
    success: true,
    message: `${uploadedImages.length} image(s) uploaded successfully`,
    images: uploadedImages
  });
});

/**
 * Get all images with pagination and filters
 */
const getImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, config.defaultImagesLimit);
  const search = req.query.search;
  const categoryId = req.query.categoryId;
  const status = req.query.status !== undefined ? req.query.status === 'true' : true;
  const sort = req.query.sort || 'createdAt:desc';

  // Build query
  const query = { status };
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (categoryId) {
    query.categoryIds = categoryId;
  }

  // Build sort object
  const sortParts = sort.split(':');
  const sortField = sortParts[0];
  const sortOrder = sortParts[1] === 'asc' ? 1 : -1;
  const sortObj = { [sortField]: sortOrder };

  // Calculate pagination
  const skip = (page - 1) * limit;
  const totalItems = await Image.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  // Get images
  const images = await Image.find(query)
    .populate('categoryIds', 'title')
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .select('title description fileName filePath mimeType size width height categoryIds countUsage countFavorite status createdAt updatedAt');

  logger.info('Images retrieved', {
    totalItems,
    page,
    limit,
    search,
    categoryId,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    totalItems,
    totalPages,
    currentPage: page,
    items: images.map(image => ({
      id: image._id,
      title: image.title,
      description: image.description,
      fileName: image.fileName,
      filePath: getImageUrl(image.filePath),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      categories: image.categoryIds.map(cat => ({
        id: cat._id,
        title: cat.title
      })),
      countUsage: image.countUsage,
      countFavorite: image.countFavorite,
      status: image.status,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }))
  });
});

/**
 * Get image by ID
 */
const getImageById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Image.findById(id)
    .populate('categoryIds', 'title')
    .populate('uploaderId', 'username');

  if (!image || !image.status) {
    return res.status(404).json({
      success: false,
      error: 'Image not found'
    });
  }

  // Optional: Increment usage count when viewing image details
  // This can be configured via environment variable
  if (config.autoIncrementUsageOnView) {
    image.countUsage += 1;
    await image.save();
  }

  logger.info('Image detail retrieved', {
    imageId: id,
    countUsage: image.countUsage,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    image: {
      id: image._id,
      title: image.title,
      description: image.description,
      fileName: image.fileName,
      filePath: getImageUrl(image.filePath),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      categories: image.categoryIds.map(cat => ({
        id: cat._id,
        title: cat.title
      })),
      countUsage: image.countUsage,
      countFavorite: image.countFavorite,
      status: image.status,
      uploader: image.uploaderId ? {
        id: image.uploaderId._id,
        username: image.uploaderId.username
      } : null,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }
  });
});

/**
 * Update image metadata
 */
const updateImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, categoryIds } = req.body;

  const image = await Image.findById(id);
  if (!image) {
    return res.status(404).json({
      success: false,
      error: 'Image not found'
    });
  }

  // Validate categoryIds if provided
  if (categoryIds) {
    const categoryIdsArray = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
    const validCategories = await Category.find({
      _id: { $in: categoryIdsArray },
      status: true
    });

    if (validCategories.length !== categoryIdsArray.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more category IDs are invalid'
      });
    }

    image.categoryIds = categoryIdsArray;
  }

  // Update fields
  if (title !== undefined) image.title = title;
  if (description !== undefined) image.description = description;

  await image.save();

  logger.info('Image updated', {
    imageId: id,
    title: image.title,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    image: {
      id: image._id,
      title: image.title,
      description: image.description,
      fileName: image.fileName,
      filePath: getImageUrl(image.filePath),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      categoryIds: image.categoryIds,
      countUsage: image.countUsage,
      countFavorite: image.countFavorite,
      status: image.status,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }
  });
});

/**
 * Soft delete image
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Image.findById(id);
  if (!image) {
    return res.status(404).json({
      success: false,
      error: 'Image not found'
    });
  }

  // Soft delete
  image.status = false;
  await image.save();

  logger.info('Image soft deleted', {
    imageId: id,
    fileName: image.fileName,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
});

module.exports = {
  uploadImages,
  getImages,
  getImageById,
  updateImage,
  deleteImage
};

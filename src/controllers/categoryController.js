const mongoose = require('mongoose');
const Category = require('../models/Category');
const Image = require('../models/Image');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validateCategory, validateObjectId, validatePagination } = require('../middlewares/validateRequest');
const logger = require('../utils/logger');
const config = require('../config');
const { getImageUrl } = require('../utils/urlHelper');
const imageService = require('../services/imageService');

const formatCategoryResponse = (category) => ({
  id: category._id,
  title: category.title,
  description: category.description,
  icon: category.icon ? getImageUrl(category.icon) : null,
  thumbnail: category.thumbnail ? getImageUrl(category.thumbnail) : null,
  status: category.status,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt
});

/**
 * Create a new category
 */
const createCategory = asyncHandler(async (req, res) => {
  const { title, description, status = true } = req.body;
  const files = req.files;

  // Handle file uploads
  let iconPath = null;
  let thumbnailPath = null;

  if (files) {
    if (files.icon && files.icon[0]) {
      iconPath = files.icon[0].path;
    }
    if (files.thumbnail && files.thumbnail[0]) {
      thumbnailPath = files.thumbnail[0].path;
    }
  }

  const category = new Category({
    title,
    description,
    icon: iconPath,
    thumbnail: thumbnailPath,
    status
  });

  await category.save();

  logger.info('Category created', {
    categoryId: category._id,
    title: category.title,
    userId: req.user?.userId
  });

  res.status(201).json({
    success: true,
    category: formatCategoryResponse(category)
  });
});

/**
 * Get all categories with pagination
 */
const getCategories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search;
  const status = req.query.status !== undefined ? req.query.status === 'true' : true;

  // Build query
  const query = { status };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const totalItems = await Category.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  // Get categories
  const categories = await Category.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('title description icon thumbnail status createdAt updatedAt');

  logger.info('Categories retrieved', {
    totalItems,
    page,
    limit,
    search,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    totalItems,
    totalPages,
    currentPage: page,
    items: categories.map(formatCategoryResponse)
  });
});

/**
 * Get category by ID with images
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const imagesPage = parseInt(req.query.imagesPage) || 1;
  const imagesLimit = parseInt(req.query.imagesLimit) || config.defaultImagesLimit;
  const imagesSearch = req.query.imagesSearch;

  // Get category
  const category = await Category.findById(id);
  if (!category || !category.status) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Build images query
  const imagesQuery = { 
    categoryIds: id, 
    status: true 
  };
  
  if (imagesSearch) {
    imagesQuery.$or = [
      { title: { $regex: imagesSearch, $options: 'i' } },
      { description: { $regex: imagesSearch, $options: 'i' } }
    ];
  }

  // Count total images
  const totalImages = await Image.countDocuments(imagesQuery);

  let images = [];
  let imagesPagination = null;

  // Check threshold
  if (totalImages <= config.imagesArrayMaxDefault) {
    // Return all images if under threshold
    images = await Image.find(imagesQuery)
      .sort({ createdAt: -1 })
      .select('title description fileName filePath mimeType size width height countUsage countFavorite status createdAt');
  } else {
    // Use pagination if over threshold
    const skip = (imagesPage - 1) * imagesLimit;
    images = await Image.find(imagesQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(imagesLimit)
      .select('title description fileName filePath mimeType size width height countUsage countFavorite status createdAt');

    imagesPagination = {
      totalItems: totalImages,
      totalPages: Math.ceil(totalImages / imagesLimit),
      currentPage: imagesPage,
      limit: imagesLimit
    };
  }

  logger.info('Category detail retrieved', {
    categoryId: id,
    totalImages,
    imagesReturned: images.length,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    category: formatCategoryResponse(category),
    images: images.map(image => ({
      id: image._id,
      title: image.title,
      description: image.description,
      fileName: image.fileName,
      filePath: getImageUrl(image.filePath),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      countUsage: image.countUsage,
      countFavorite: image.countFavorite,
      status: image.status,
      createdAt: image.createdAt
    })),
    ...(imagesPagination && { imagesPagination })
  });
});

/**
 * Update category
 */
const handleCategoryUpdate = async (req, res, actionLabel) => {
  const { id } = req.params;
  const { title, description, status, newId } = req.body;
  const files = req.files;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Handle file uploads and cleanup old files
  if (files) {
    if (files.icon && files.icon[0]) {
      // Delete old icon file if exists
      if (category.icon) {
        await imageService.deleteImageFile(category.icon);
      }
      category.icon = files.icon[0].path;
    }
    if (files.thumbnail && files.thumbnail[0]) {
      // Delete old thumbnail file if exists
      if (category.thumbnail) {
        await imageService.deleteImageFile(category.thumbnail);
      }
      category.thumbnail = files.thumbnail[0].path;
    }
  }

  // Update fields
  if (title !== undefined) category.title = title;
  if (description !== undefined) category.description = description;
  if (status !== undefined) category.status = status;

  const oldCategoryId = category._id.toString();
  const normalizedNewId = newId?.toString();
  const shouldChangeId = normalizedNewId && normalizedNewId !== oldCategoryId;

  let savedCategory = category;
  let imagesUpdated = 0;

  if (shouldChangeId) {
    if (!mongoose.Types.ObjectId.isValid(normalizedNewId)) {
      return res.status(400).json({
        success: false,
        error: 'newId must be a valid MongoDB ObjectId'
      });
    }

    const newCategoryId = new mongoose.Types.ObjectId(normalizedNewId);
    const existingCategory = await Category.findById(newCategoryId);
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with the provided newId already exists'
      });
    }

    const newCategoryData = {
      _id: newCategoryId,
      title: category.title,
      description: category.description,
      icon: category.icon,
      thumbnail: category.thumbnail,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: new Date()
    };

    const newCategory = await Category.create(newCategoryData);

    try {
      const imageUpdateResult = await Image.updateMany(
        { categoryIds: category._id },
        { $set: { 'categoryIds.$[elem]': newCategoryId } },
        { arrayFilters: [{ elem: { $eq: category._id } }] }
      );

      imagesUpdated = imageUpdateResult.modifiedCount;
      await category.deleteOne();
      savedCategory = newCategory;
    } catch (error) {
      // Rollback if remapping fails
      await Category.deleteOne({ _id: newCategoryId });
      throw error;
    }
  } else {
    await category.save();
  }

  logger.info(`Category ${actionLabel}`, {
    categoryId: savedCategory._id,
    previousCategoryId: id,
    idChanged: shouldChangeId,
    imagesUpdated,
    title: savedCategory.title,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    category: formatCategoryResponse(savedCategory)
  });
};

const updateCategory = asyncHandler(async (req, res) => {
  await handleCategoryUpdate(req, res, 'updated');
});

/**
 * Edit category (PATCH - partial update)
 */
const editCategory = asyncHandler(async (req, res) => {
  await handleCategoryUpdate(req, res, 'edited');
});

/**
 * Permanently delete category
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Delete associated files
  if (category.icon) {
    await imageService.deleteImageFile(category.icon);
  }
  if (category.thumbnail) {
    await imageService.deleteImageFile(category.thumbnail);
  }

  // Remove category reference from images to keep data consistent
  const imageUpdateResult = await Image.updateMany(
    { categoryIds: id },
    { $pull: { categoryIds: id } }
  );

  await category.deleteOne();

  logger.info('Category permanently deleted', {
    categoryId: id,
    title: category.title,
    imagesUpdated: imageUpdateResult.modifiedCount,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  editCategory,
  deleteCategory
};

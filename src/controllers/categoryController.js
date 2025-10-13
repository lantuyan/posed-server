const Category = require('../models/Category');
const Image = require('../models/Image');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validateCategory, validateObjectId, validatePagination } = require('../middlewares/validateRequest');
const logger = require('../utils/logger');
const config = require('../config');
const { getImageUrl } = require('../utils/urlHelper');

/**
 * Create a new category
 */
const createCategory = asyncHandler(async (req, res) => {
  const { title, description, status = true } = req.body;

  const category = new Category({
    title,
    description,
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
    category: {
      id: category._id,
      title: category.title,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }
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
    .select('title description status createdAt updatedAt');

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
    items: categories.map(category => ({
      id: category._id,
      title: category.title,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))
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
    category: {
      id: category._id,
      title: category.title,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    },
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
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Update fields
  if (title !== undefined) category.title = title;
  if (description !== undefined) category.description = description;
  if (status !== undefined) category.status = status;

  await category.save();

  logger.info('Category updated', {
    categoryId: id,
    title: category.title,
    userId: req.user?.userId
  });

  res.json({
    success: true,
    category: {
      id: category._id,
      title: category.title,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }
  });
});

/**
 * Soft delete category
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

  // Soft delete
  category.status = false;
  await category.save();

  logger.info('Category soft deleted', {
    categoryId: id,
    title: category.title,
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
  deleteCategory
};

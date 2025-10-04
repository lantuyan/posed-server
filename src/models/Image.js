const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  title: { 
    type: String,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 1000
  },
  filePath: { 
    type: String, 
    required: true 
  },
  fileName: { 
    type: String, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  width: { 
    type: Number, 
    required: true 
  },
  height: { 
    type: Number, 
    required: true 
  },
  categoryIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category' 
  }],
  status: { 
    type: Boolean, 
    default: true 
  },
  countUsage: { 
    type: Number, 
    default: 0 
  },
  countFavorite: { 
    type: Number, 
    default: 0 
  },
  uploaderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdminUser' 
  }
}, { 
  timestamps: true 
});

// Indexes for performance optimization
ImageSchema.index({ categoryIds: 1 });
ImageSchema.index({ createdAt: -1 });
ImageSchema.index({ status: 1 });
ImageSchema.index({ countUsage: -1 });
ImageSchema.index({ countFavorite: -1 });

module.exports = mongoose.model('Image', ImageSchema);


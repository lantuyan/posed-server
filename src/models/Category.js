const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  status: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Index for status and title for faster queries
CategorySchema.index({ status: 1 });
CategorySchema.index({ title: 1 });

module.exports = mongoose.model('Category', CategorySchema);


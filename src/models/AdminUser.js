const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'editor'], 
    required: true,
    default: 'editor'
  }
}, { 
  timestamps: true 
});

// Index for username for faster lookups
AdminUserSchema.index({ username: 1 });

module.exports = mongoose.model('AdminUser', AdminUserSchema);


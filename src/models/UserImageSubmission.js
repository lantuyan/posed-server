const mongoose = require('mongoose');

const submissionMetaSchema = new mongoose.Schema({
  tokenTime: { type: Date },
  tokenTimeString: { type: String },
  timeDiffSeconds: { type: Number },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { _id: false });

const UserImageSubmissionSchema = new mongoose.Schema({
  originalFileName: {
    type: String,
    trim: true,
    maxlength: 255
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  assignedCategoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  reviewedAt: {
    type: Date
  },
  submissionMeta: submissionMetaSchema
}, {
  timestamps: true
});

UserImageSubmissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('UserImageSubmission', UserImageSubmissionSchema);


const mongoose = require('mongoose');

const TaskActionSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  actionType: {
    type: String,
    enum: ['comment', 'status_change', 'assignment', 'time_log', 'attachment', 'mention', 'approval', 'rejection', 'custom'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: Map,
    of: String
  },
  content: {
    type: String
  },
  attachments: [{
    name: String,
    url: String,
    size: Number,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

TaskActionSchema.index({ task: 1, createdAt: -1 });
TaskActionSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('TaskAction', TaskActionSchema);
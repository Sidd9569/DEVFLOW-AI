const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'login',
      'logout',
      'assign',
      'unassign',
      'complete',
      'comment',
      'upload',
      'status-change',
      'priority-change'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'product', 'sprint', 'task', 'issue', 'comment']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityName: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ product: 1, createdAt: -1 });
ActivitySchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Activity', ActivitySchema);
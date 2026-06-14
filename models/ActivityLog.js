const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'approve', 'reject', 
      'assign', 'unassign', 'start', 'complete', 'reopen',
      'login', 'logout', 'status_change', 'priority_change'
    ]
  },
  
  // Entity being acted upon
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'product', 'project', 'sprint', 'task', 'issue', 'test', 'dashboard']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // User who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Additional details
  details: {
    type: String,
    default: ''
  },
  
  // Changes made (for updates)
  changes: {
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: String
  },
  
  // IP address and user agent
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '90d' // Auto-delete after 90 days
  }
});

// Indexes for efficient querying
ActivityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
ActivityLogSchema.index({ performedBy: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

// Static method to log activity
ActivityLogSchema.statics.log = async function(data) {
  return await this.create(data);
};

// Static method to get activities by entity
ActivityLogSchema.statics.getByEntity = async function(entityType, entityId, limit = 50) {
  return await this.find({ entityType, entityId })
    .populate('performedBy', 'firstName lastName email role avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get activities by user
ActivityLogSchema.statics.getByUser = async function(userId, limit = 50) {
  return await this.find({ performedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent activities
ActivityLogSchema.statics.getRecent = async function(limit = 100) {
  return await this.find()
    .populate('performedBy', 'firstName lastName email role avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
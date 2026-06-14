const mongoose = require('mongoose');

const StatusTransitionSchema = new mongoose.Schema({
  fromStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskStatus',
    required: true
  },
  toStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskStatus',
    required: true
  },
  requiredRoles: [{
    type: String,
    enum: ['manager', 'team_lead', 'developer', 'viewer']
  }],
  requiredPermissions: [{
    type: String
  }],
  conditions: {
    type: Map,
    of: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  }
}, { timestamps: true });

// Compound index to prevent duplicate transitions
StatusTransitionSchema.index({ fromStatus: 1, toStatus: 1 }, { unique: true });

module.exports = mongoose.model('StatusTransition', StatusTransitionSchema);
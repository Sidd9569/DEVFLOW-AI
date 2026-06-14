const mongoose = require('mongoose');

const TaskStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Backlog', 'Todo', 'In Progress', 'In Review', 'Testing', 'Done', 'Completed', 'Blocked', 'Cancelled']
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  color: {
    type: String,
    default: '#808080'
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('TaskStatus', TaskStatusSchema);
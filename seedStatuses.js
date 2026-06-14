const mongoose = require('mongoose');
const TaskStatus = require('./models/TaskStatus');
const StatusTransition = require('./models/StatusTransition');
require('dotenv').config();

const statuses = [
  { name: 'Backlog', order: 0, color: '#6c757d', description: 'Task is in the backlog, not yet started' },
  { name: 'Todo', order: 1, color: '#007bff', description: 'Task is ready to be worked on' },
  { name: 'In Progress', order: 2, color: '#28a745', description: 'Task is currently being worked on' },
  { name: 'In Review', order: 3, color: '#fd7e14', description: 'Task is under review' },
  { name: 'Testing', order: 4, color: '#17a2b8', description: 'Task is being tested' },
  { name: 'Done', order: 5, color: '#20c997', description: 'Task is completed' },
  { name: 'Blocked', order: 6, color: '#dc3545', description: 'Task is blocked and cannot proceed' },
  { name: 'Cancelled', order: 7, color: '#6c757d', description: 'Task has been cancelled' }
];

const transitions = [
  // From Backlog
  { from: 'Backlog', to: 'Todo', roles: ['manager', 'team_lead', 'developer'], description: 'Move task from backlog to todo' },
  { from: 'Backlog', to: 'Cancelled', roles: ['manager', 'team_lead'], description: 'Cancel a backlog task' },
  
  // From Todo
  { from: 'Todo', to: 'Backlog', roles: ['manager', 'team_lead', 'developer'], description: 'Move task back to backlog' },
  { from: 'Todo', to: 'In Progress', roles: ['manager', 'team_lead', 'developer'], description: 'Start working on task', conditions: { assigneeRequired: 'true' } },
  { from: 'Todo', to: 'Cancelled', roles: ['manager', 'team_lead'], description: 'Cancel a todo task' },
  
  // From In Progress
  { from: 'In Progress', to: 'Todo', roles: ['manager', 'team_lead', 'developer'], description: 'Move task back to todo' },
  { from: 'In Progress', to: 'In Review', roles: ['manager', 'team_lead', 'developer'], description: 'Submit task for review', conditions: { minProgress: '80' } },
  { from: 'In Progress', to: 'Testing', roles: ['manager', 'team_lead'], description: 'Move task to testing', conditions: { minProgress: '90' } },
  { from: 'In Progress', to: 'Blocked', roles: ['manager', 'team_lead', 'developer'], description: 'Mark task as blocked' },
  { from: 'In Progress', to: 'Done', roles: ['manager', 'team_lead'], description: 'Complete task directly from progress', conditions: { minProgress: '100' } },
  
  // From In Review
  { from: 'In Review', to: 'In Progress', roles: ['manager', 'team_lead', 'developer'], description: 'Return task for more work' },
  { from: 'In Review', to: 'Testing', roles: ['manager', 'team_lead'], description: 'Approve and move to testing' },
  { from: 'In Review', to: 'Blocked', roles: ['manager', 'team_lead'], description: 'Mark review as blocked' },
  
  // From Testing
  { from: 'Testing', to: 'In Progress', roles: ['manager', 'team_lead'], description: 'Return from testing for fixes' },
  { from: 'Testing', to: 'In Review', roles: ['manager', 'team_lead'], description: 'Send back for review after testing' },
  { from: 'Testing', to: 'Done', roles: ['manager', 'team_lead'], description: 'Pass testing and complete task' },
  { from: 'Testing', to: 'Blocked', roles: ['manager', 'team_lead'], description: 'Mark testing as blocked' },
  
  // From Done
  { from: 'Done', to: 'In Progress', roles: ['manager'], description: 'Reopen completed task' },
  { from: 'Done', to: 'Todo', roles: ['manager'], description: 'Reopen task to todo' },
  
  // From Blocked
  { from: 'Blocked', to: 'In Progress', roles: ['manager', 'team_lead', 'developer'], description: 'Unblock and continue work' },
  { from: 'Blocked', to: 'Todo', roles: ['manager', 'team_lead'], description: 'Unblock and return to todo' },
  { from: 'Blocked', to: 'Cancelled', roles: ['manager'], description: 'Cancel blocked task' },
  
  // From Cancelled
  { from: 'Cancelled', to: 'Backlog', roles: ['manager'], description: 'Restore cancelled task to backlog' },
  { from: 'Cancelled', to: 'Todo', roles: ['manager'], description: 'Restore cancelled task to todo' }
];

const seedDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/devflow';
    console.log('Using MongoDB URI:', uri ? '***connected***' : 'not found');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await TaskStatus.deleteMany({});
    await StatusTransition.deleteMany({});
    console.log('Cleared existing statuses and transitions');

    // Create statuses
    const createdStatuses = await TaskStatus.insertMany(statuses);
    console.log(`Created ${createdStatuses.length} statuses`);

    // Create status map for easy lookup
    const statusMap = {};
    createdStatuses.forEach(status => {
      statusMap[status.name] = status._id;
    });

    // Create transitions
    const transitionDocs = [];
    for (const transition of transitions) {
      const fromStatus = statusMap[transition.from];
      const toStatus = statusMap[transition.to];
      
      if (fromStatus && toStatus) {
        transitionDocs.push({
          fromStatus,
          toStatus,
          requiredRoles: transition.roles,
          requiredPermissions: [],
          conditions: transition.conditions || {},
          isActive: true,
          description: transition.description
        });
      }
    }

    await StatusTransition.insertMany(transitionDocs);
    console.log(`Created ${transitionDocs.length} status transitions`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
# Sprint Management System - Complete Guide

## Overview

This document describes the enhanced Sprint and Task Management system with permission-based status transitions, progress tracking, and action management.

## Key Features

### 1. Permission-Based Status Management

The system implements a robust permission system that controls who can change task statuses and perform various actions.

#### Status Flow
```
Backlog → Todo → In Progress → In Review → Testing → Done
    ↑         ↑         ↑           ↑          ↑       ↑
    └─────────┴─────────┴───────────┴──────────┴───────┘
                         (Reverse transitions allowed with permissions)
```

#### Role-Based Permissions

| Role | Create Sprint | Edit Sprint | Start Sprint | Complete Sprint | Delete Sprint | Task Management |
|------|---------------|-------------|--------------|-----------------|---------------|-----------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | All |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | All |
| Team Lead | ❌ | ✅ | ✅ | ✅ | ❌ | Most |
| Developer | ❌ | ❌ | ❌ | ❌ | ❌ | Self-assigned |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | View Only |

### 2. Progress Tracking

#### Task Progress
- Manual progress percentage (0-100%)
- Automatic progress based on subtasks completion
- Progress history tracking

#### Sprint Progress
- Task completion rate
- Story points completed vs total
- Burndown charts
- Days remaining calculation

### 3. Action Management

All task actions are logged with:
- Who performed the action
- What changed (previous/new values)
- Timestamp
- Optional comments

#### Action Types
- `comment` - User comments
- `status_change` - Status transitions
- `assignment` - Assignee changes
- `time_log` - Time tracking entries
- `attachment` - File uploads
- `mention` - User mentions
- `approval`/`rejection` - Review actions

## API Endpoints

### Task Management

```
GET    /api/tasks                    - List all tasks with filters
GET    /api/tasks/:id                - Get task details with transitions
POST   /api/tasks                    - Create new task
PUT    /api/tasks/:id                - Update task
PUT    /api/tasks/:id/status         - Change task status (permission validated)
PUT    /api/tasks/:id/progress       - Update progress percentage
GET    /api/tasks/:id/transitions    - Get available status transitions
POST   /api/tasks/:id/actions        - Add action/comment
GET    /api/tasks/:id/actions        - Get task action history
POST   /api/tasks/:id/time-log       - Log time spent
GET    /api/tasks/by-status          - Get tasks grouped by status (Kanban)
PUT    /api/tasks/bulk               - Bulk update tasks
DELETE /api/tasks/:id                - Soft delete task
GET    /api/tasks/stats              - Get task statistics
```

### Sprint Management

```
GET    /api/sprints                  - List all sprints
GET    /api/sprints/:id              - Get sprint details with progress
POST   /api/sprints                  - Create new sprint
PUT    /api/sprints/:id              - Update sprint
DELETE /api/sprints/:id              - Archive sprint
POST   /api/sprints/:id/start        - Start a sprint
POST   /api/sprints/:id/complete     - Complete a sprint
GET    /api/sprints/:id/stats        - Get sprint statistics
GET    /api/sprints/:id/burndown     - Get burndown chart data
POST   /api/sprints/:id/team         - Add team members
DELETE /api/sprints/:id/team/:userId - Remove team member
```

## Database Models

### TaskStatus
```javascript
{
  name: String,           // Backlog, Todo, In Progress, etc.
  order: Number,          // Display order
  color: String,          // Hex color for UI
  description: String,
  isActive: Boolean
}
```

### StatusTransition
```javascript
{
  fromStatus: ObjectId,        // Source status
  toStatus: ObjectId,          // Target status
  requiredRoles: [String],     // Allowed roles
  requiredPermissions: [String], // Required permissions
  conditions: Map,             // Additional conditions
  isActive: Boolean,
  description: String
}
```

### TaskAction
```javascript
{
  task: ObjectId,
  actionType: String,          // comment, status_change, etc.
  performedBy: ObjectId,
  previousValue: Mixed,
  newValue: Mixed,
  content: String,
  attachments: [Object],
  mentions: [ObjectId],
  isSystemGenerated: Boolean,
  createdAt: Date
}
```

## Setup Instructions

### 1. Seed Status Transitions

Run the seeder to create default statuses and transitions:

```bash
node seedStatuses.js
```

### 2. Start the Application

```bash
npm start
```

### 3. Access the Application

- Sprint Management: `http://localhost:3000/sprints`
- Kanban Board: `http://localhost:3000/kanban`
- Admin Portal: `http://localhost:3000/admin`

## Frontend Features

### Sprint Management Page (`/sprints`)

- **Sprint Cards**: Display sprint progress, team, dates, and actions
- **Permission-Based Actions**: Buttons shown/hidden based on user role
- **Progress Visualization**: Progress bars, task counts, story points
- **Quick Actions**: Start, Complete, Edit, Delete (based on permissions)

### Kanban Board (`/kanban`)

- **Drag & Drop**: Move tasks between statuses (permission validated)
- **Visual Indicators**: Priority colors, progress bars, blocked status
- **Task Details Modal**: Full task view with actions
- **Available Transitions**: Shows allowed status changes with lock icons for unavailable ones

## Permission Validation Flow

1. User attempts action (e.g., change task status)
2. Frontend checks `hasPermission()` for UI display
3. User performs action
4. Backend validates transition rules:
   - Checks `StatusTransition` document
   - Validates user role against `requiredRoles`
   - Validates user permissions against `requiredPermissions`
   - Checks any additional `conditions`
5. If valid, action is performed and logged in `TaskAction`
6. Response returned to frontend with updated data

## Example: Changing Task Status

```javascript
// Frontend
const response = await fetch(`/api/tasks/${taskId}/status`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ statusId: newStatusId })
});

// Backend validates:
// 1. Transition exists from current to new status
// 2. User has required role
// 3. User has required permissions
// 4. All conditions are met (e.g., assignee required, min progress)
// 5. If valid, updates task and logs action
```

## Best Practices

1. **Always validate permissions on the backend** - Frontend checks are for UX only
2. **Log all significant actions** - Use TaskAction for audit trail
3. **Use soft deletes** - Set `isDeleted: true` instead of removing documents
4. **Handle transition errors gracefully** - Show clear error messages to users
5. **Update sprint progress automatically** - When tasks change status

## Troubleshooting

### Issue: Cannot change task status
- Check if `StatusTransition` exists between the statuses
- Verify user has required role in transition
- Check if any conditions are blocking the transition

### Issue: Sprint progress not updating
- Ensure task has valid status reference
- Check if completed status is configured correctly
- Verify sprint pre-save hook is running

### Issue: Permission denied errors
- Check user role in database
- Verify role permissions in code
- Ensure token is valid and not expired

## Support

For issues or questions, please refer to the main README.md or contact the development team.
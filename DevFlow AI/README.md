# DevFlow AI - Production-Level SaaS Application

A full-stack project management SaaS application built with Node.js, Express, MongoDB, and a modern frontend using Bootstrap 5, jQuery, and Chart.js.

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Role-based access control (Admin, Manager, Developer)
- Password encryption with bcrypt

### Product Management
- Create, edit, and delete products
- Product dashboard with team management
- Product status tracking

### Sprint Management
- Create and manage sprints
- Sprint timeline visualization
- Sprint status tracking (Planned, Active, Completed, Cancelled)

### Kanban Board
- Visual task management with 4 columns: To Do, In Progress, Testing, Done
- Drag and drop tasks between columns
- Task priority levels (Low, Medium, High, Critical)
- Real-time status updates

### Issue Tracker
- Create and track issues
- Priority and status management
- Assign issues to team members

### AI Feature Generator
- Enter startup idea and generate roadmap
- Automatic feature suggestions
- Phase-based planning with time estimates
- Convert roadmap to tasks

### Analytics Dashboard
- Task completion statistics
- Team performance metrics
- Product progress tracking
- Interactive charts with Chart.js

### Team Management
- Add and manage team members
- Role assignment
- Member invitations

### Notifications
- Real-time notifications with Socket.io
- Notification center
- Unread count badge

### Activity Logs
- Track all user actions
- Entity-specific activity history

### User Profile
- Update profile information
- Change password
- Account management

### Dark/Light Theme
- Toggle between dark and light themes
- Theme preference saved in localStorage

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB Atlas (Mongoose ODM)
- JWT for authentication
- bcrypt for password hashing
- Socket.io for real-time notifications

### Frontend
- HTML5
- CSS3
- Bootstrap 5
- jQuery
- jQuery UI (for drag and drop)
- Chart.js (for analytics)
- Socket.io client

## Project Structure

```
DevFlow AI/
├── src/
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── ai.controller.js
│   │   ├── analytics.controller.js
│   │   ├── kanban.controller.js
│   │   ├── notification.controller.js
│   │   ├── product.controller.js
│   │   ├── profile.controller.js
│   │   ├── sprint.controller.js
│   │   └── team.controller.js
│   ├── middlewares/
│   │   └── auth.middleware.js
│   ├── models/
│   │   ├── ActivityLog.model.js
│   │   ├── Issue.model.js
│   │   ├── Notification.model.js
│   │   ├── Product.model.js
│   │   ├── Roadmap.model.js
│   │   ├── Sprint.model.js
│   │   ├── Task.model.js
│   │   ├── Team.model.js
│   │   └── User.model.js
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   └── app.js
│   │   └── index.html
│   ├── routes/
│   │   ├── ai.routes.js
│   │   ├── analytics.routes.js
│   │   ├── auth.routes.js
│   │   ├── index.js
│   │   ├── issue.routes.js
│   │   ├── kanban.routes.js
│   │   ├── notification.routes.js
│   │   ├── product.routes.js
│   │   ├── profile.routes.js
│   │   ├── sprint.routes.js
│   │   └── team.routes.js
│   ├── services/
│   ├── sockets/
│   │   └── socket.js
│   ├── utils/
│   └── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── Procfile
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DevFlow\ AI
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: A secure random string for JWT signing
     - `PORT`: Server port (default: 3000)

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| BCRYPT_SALT_ROUNDS | Password hashing rounds | 12 |
| CORS_ORIGIN | Allowed CORS origins | * |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sprints
- `GET /api/sprints` - Get all sprints
- `GET /api/sprints/:id` - Get sprint by ID
- `POST /api/sprints` - Create sprint
- `PUT /api/sprints/:id` - Update sprint
- `PATCH /api/sprints/:id/status` - Update sprint status
- `DELETE /api/sprints/:id` - Delete sprint

### Kanban/Tasks
- `GET /api/kanban` - Get all tasks
- `GET /api/kanban/board` - Get kanban board
- `GET /api/kanban/:id` - Get task by ID
- `POST /api/kanban` - Create task
- `PUT /api/kanban/:id` - Update task
- `PATCH /api/kanban/:id/status` - Update task status
- `POST /api/kanban/reorder` - Reorder tasks
- `DELETE /api/kanban/:id` - Delete task

### Issues
- `GET /api/issues` - Get all issues
- `GET /api/issues/:id` - Get issue by ID
- `POST /api/issues` - Create issue
- `PUT /api/issues/:id` - Update issue
- `PATCH /api/issues/:id/status` - Update issue status
- `DELETE /api/issues/:id` - Delete issue

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create team
- `POST /api/teams/:id/members` - Add member
- `PUT /api/teams/:id/members/role` - Update member role
- `DELETE /api/teams/:id/members/:userId` - Remove member
- `POST /api/teams/:id/invite` - Invite member
- `POST /api/teams/accept-invitation` - Accept invitation

### AI Features
- `POST /api/ai/generate` - Generate roadmap from idea
- `POST /api/ai/save` - Save generated roadmap
- `GET /api/ai/roadmaps` - Get all roadmaps
- `GET /api/ai/roadmaps/:id` - Get roadmap by ID
- `POST /api/ai/convert` - Convert roadmap to tasks

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/tasks-by-status` - Get tasks grouped by status
- `GET /api/analytics/tasks-by-priority` - Get tasks grouped by priority
- `GET /api/analytics/team-performance` - Get team performance data
- `GET /api/analytics/product-progress/:product` - Get product progress
- `GET /api/analytics/activity-timeline` - Get activity timeline
- `GET /api/analytics/charts` - Get chart data

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Profile
- `GET /api/profile` - Get user profile
- `GET /api/profile/verify` - Verify JWT token
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password
- `DELETE /api/profile` - Delete account

## Deployment

### Render Deployment

1. Create a new Web Service on Render
2. Connect your repository
3. Configure build and start commands:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables from `.env.example`
5. Deploy

The `Procfile` is already configured for Render deployment.

## License

ISC
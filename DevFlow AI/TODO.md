# DevFlow AI - Implementation Checklist

## Plan Phase
- [ ] Create project skeleton (backend + frontend + config)
- [ ] Implement MVC backend: models, controllers, routes, middleware
- [ ] Implement auth (register/login/logout) with JWT + bcrypt
- [ ] Implement RBAC (admin/manager/developer)

## Core Features
- [ ] Product Management (CRUD + dashboard)
- [ ] Sprint Management (CRUD + timeline + status)
- [ ] Kanban board (sortable drag/drop, persist columns)
- [ ] Team Management (invite/add members + role assignment)
- [ ] Issue Tracker (create/list/update with priority/status/assignee)
- [ ] AI Feature Generator (generate & save roadmap)

## Real-time & Activity
- [ ] Socket.io notifications
- [ ] Activity Logs middleware/service (track every user action)

## Profile & UX
- [ ] User profile update + change password
- [ ] Dark/Light theme toggle
- [ ] Responsive UI

## Analytics
- [ ] Analytics dashboard with Chart.js graphs

## Deployment & Production
- [ ] MongoDB Atlas integration (mongoose)
- [ ] Environment variables (.env.example)
- [ ] Render deployment readiness (Procfile, start scripts)
- [ ] Basic security hardening (rate limit, helmet, cors)
- [ ] Run lint/test/dev build


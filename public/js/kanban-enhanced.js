// Enhanced Kanban Board with Permission-Based Status Management

class EnhancedKanbanBoard {
    constructor() {
        this.tasks = [];
        this.statuses = [];
        this.availableTransitions = {};
        this.currentUser = null;
        this.draggedTask = null;
        this.sprintId = null;
        
        this.init();
    }

    async init() {
        try {
            this.currentUser = await this.getCurrentUser();
            this.sprintId = this.getSprintIdFromUrl();
            
            await Promise.all([
                this.loadStatuses(),
                this.loadTasks()
            ]);
            
            this.renderBoard();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing Kanban board:', error);
        }
    }

    async getCurrentUser() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return null;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            window.location.href = '/login';
            return null;
        }

        return await response.json();
    }

    getSprintIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('sprint');
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async loadStatuses() {
        try {
            const response = await fetch('/api/tasks/statuses', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.statuses = await response.json();
            }
        } catch (error) {
            console.error('Error loading statuses:', error);
        }
    }

    async loadTasks() {
        try {
            let url = '/api/tasks/by-status';
            if (this.sprintId) {
                url += `?sprint=${this.sprintId}`;
            }

            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.tasks = await response.json();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async loadTaskTransitions(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/transitions`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const transitions = await response.json();
                this.availableTransitions[taskId] = transitions;
            }
        } catch (error) {
            console.error('Error loading transitions:', error);
        }
    }

    canTransitionTask(taskId, toStatusId) {
        const transitions = this.availableTransitions[taskId];
        if (!transitions) return false;

        const transition = transitions.find(t => 
            t.toStatus._id === toStatusId
        );

        return transition && transition.canTransition;
    }

    getTransitionReason(taskId, toStatusId) {
        const transitions = this.availableTransitions[taskId];
        if (!transitions) return 'Transition information not available';

        const transition = transitions.find(t => 
            t.toStatus._id === toStatusId
        );

        if (!transition) return 'Transition not defined';
        if (transition.canTransition) return 'Allowed';

        return transition.reasons?.join(', ') || 'Permission denied';
    }

    renderBoard() {
        const board = document.getElementById('kanban-board');
        if (!board) return;

        board.innerHTML = this.statuses.map(status => `
            <div class="kanban-column" data-status-id="${status._id}">
                <div class="column-header" style="border-left: 4px solid ${status.color}">
                    <h3>${status.name}</h3>
                    <span class="task-count">${this.tasks[status._id]?.tasks?.length || 0}</span>
                </div>
                <div class="column-tasks" data-status-id="${status._id}">
                    ${(this.tasks[status._id]?.tasks || []).map(task => this.renderTaskCard(task)).join('')}
                </div>
            </div>
        `).join('');

        // Load transitions for all tasks
        Object.values(this.tasks).forEach(({ tasks }) => {
            tasks.forEach(task => this.loadTaskTransitions(task._id));
        });
    }

    renderTaskCard(task) {
        const progress = task.progress?.percentage || 0;
        const assignee = task.assignee;
        const priority = task.priority;
        const isBlocked = task.status?.name === 'Blocked';

        let priorityClass = '';
        let priorityLabel = '';
        switch (priority) {
            case 'urgent':
                priorityClass = 'priority-urgent';
                priorityLabel = 'Urgent';
                break;
            case 'high':
                priorityClass = 'priority-high';
                priorityLabel = 'High';
                break;
            case 'medium':
                priorityClass = 'priority-medium';
                priorityLabel = 'Medium';
                break;
            case 'low':
                priorityClass = 'priority-low';
                priorityLabel = 'Low';
                break;
        }

        return `
            <div class="task-card ${priorityClass} ${isBlocked ? 'blocked' : ''}" 
                 data-task-id="${task._id}" 
                 draggable="true"
                 title="${task.title}">
                
                <div class="task-header">
                    <span class="task-id">#${task._id.slice(-4)}</span>
                    <div class="task-actions-mini">
                        <button class="task-action-btn" onclick="board.showTaskDetails('${task._id}')" title="View Details">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>

                <div class="task-title">${task.title}</div>

                ${task.description ? `
                    <div class="task-description">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>
                ` : ''}

                <div class="task-progress">
                    <div class="progress-bar-mini">
                        <div class="progress-fill-mini" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                </div>

                <div class="task-meta">
                    ${assignee ? `
                        <div class="task-assignee" title="${assignee.name}">
                            <i class="fas fa-user"></i>
                            <span>${assignee.name.split(' ')[0]}</span>
                        </div>
                    ` : ''}

                    <div class="task-story-points">
                        <i class="fas fa-star"></i>
                        <span>${task.storyPoints || 0}</span>
                    </div>

                    ${task.dueDate ? `
                        <div class="task-due-date ${this.isOverdue(task.dueDate) ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>

                ${task.subtasks && task.subtasks.length > 0 ? `
                    <div class="task-subtasks">
                        <i class="fas fa-tasks"></i>
                        <span>${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}</span>
                    </div>
                ` : ''}

                ${task.labels && task.labels.length > 0 ? `
                    <div class="task-labels">
                        ${task.labels.slice(0, 3).map(label => `
                            <span class="label">${label}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    isOverdue(dueDate) {
        return new Date(dueDate) < new Date();
    }

    setupEventListeners() {
        // Drag and drop
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-card')) {
                this.draggedTask = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (this.draggedTask) {
                this.draggedTask.classList.remove('dragging');
                this.draggedTask = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const column = e.target.closest('.kanban-column');
            if (column) {
                column.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const column = e.target.closest('.kanban-column');
            if (column) {
                column.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            const column = e.target.closest('.kanban-column');
            
            if (column && this.draggedTask) {
                column.classList.remove('drag-over');
                
                const taskId = this.draggedTask.dataset.taskId;
                const newStatusId = column.dataset.statusId;

                await this.updateTaskStatus(taskId, newStatusId);
            }
        });
    }

    async updateTaskStatus(taskId, newStatusId) {
        // Check if transition is allowed
        if (!this.canTransitionTask(taskId, newStatusId)) {
            const reason = this.getTransitionReason(taskId, newStatusId);
            this.showNotification(`Cannot move task: ${reason}`, 'error');
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}/status`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ statusId: newStatusId })
            });

            if (response.ok) {
                await this.loadTasks();
                this.renderBoard();
                this.showNotification('Task status updated successfully', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to update task status', 'error');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            this.showNotification('Failed to update task status', 'error');
        }
    }

    async updateTaskProgress(taskId, progress) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/progress`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ percentage: progress })
            });

            if (response.ok) {
                await this.loadTasks();
                this.renderBoard();
                this.showNotification('Task progress updated', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to update progress', 'error');
            }
        } catch (error) {
            console.error('Error updating progress:', error);
            this.showNotification('Failed to update progress', 'error');
        }
    }

    async showTaskDetails(taskId) {
        // Load full task details
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const task = await response.json();
                this.openTaskModal(task);
            }
        } catch (error) {
            console.error('Error loading task details:', error);
        }
    }

    openTaskModal(task) {
        const modal = document.getElementById('task-modal');
        if (!modal) return;

        // Populate modal with task details
        document.getElementById('task-title').textContent = task.title;
        document.getElementById('task-description').textContent = task.description || 'No description';
        document.getElementById('task-status').textContent = task.status?.name || 'Unknown';
        document.getElementById('task-priority').textContent = task.priority;
        document.getElementById('task-assignee').textContent = task.assignee?.name || 'Unassigned';
        document.getElementById('task-story-points').textContent = task.storyPoints || 0;
        
        // Progress slider
        const progressSlider = document.getElementById('task-progress-slider');
        const progressValue = document.getElementById('task-progress-value');
        progressSlider.value = task.progress?.percentage || 0;
        progressValue.textContent = `${task.progress?.percentage || 0}%`;

        progressSlider.oninput = async (e) => {
            const value = e.target.value;
            progressValue.textContent = `${value}%`;
        };

        progressSlider.onchange = async (e) => {
            await this.updateTaskProgress(task._id, parseInt(e.target.value));
        };

        // Available transitions
        const transitionsContainer = document.getElementById('task-transitions');
        const transitions = this.availableTransitions[task._id] || [];
        
        transitionsContainer.innerHTML = transitions.map(t => `
            <button class="transition-btn ${t.canTransition ? '' : 'disabled'}" 
                    onclick="board.executeTransition('${task._id}', '${t.toStatus._id}')"
                    ${!t.canTransition ? 'disabled' : ''}
                    title="${t.reasons?.join(', ') || ''}">
                ${t.toStatus.name}
                ${!t.canTransition ? ' 🔒' : ''}
            </button>
        `).join('');

        // Show available actions based on permissions
        this.renderTaskActions(task);

        modal.classList.add('active');
    }

    renderTaskActions(task) {
        const actionsContainer = document.getElementById('task-actions');
        const actions = [];

        // Check permissions for various actions
        if (this.hasPermission('task.edit')) {
            actions.push({ icon: 'edit', label: 'Edit', action: `editTask('${task._id}')` });
        }

        if (this.hasPermission('task.assign')) {
            actions.push({ icon: 'user-plus', label: 'Assign', action: `assignTask('${task._id}')` });
        }

        if (this.hasPermission('task.comment')) {
            actions.push({ icon: 'comment', label: 'Comment', action: `addComment('${task._id}')` });
        }

        if (this.hasPermission('task.time-log')) {
            actions.push({ icon: 'clock', label: 'Log Time', action: `logTime('${task._id}')` });
        }

        if (this.hasPermission('task.delete')) {
            actions.push({ icon: 'trash', label: 'Delete', action: `deleteTask('${task._id}')`, danger: true });
        }

        actionsContainer.innerHTML = actions.map(action => `
            <button class="action-btn ${action.danger ? 'danger' : ''}" onclick="${action.action}">
                <i class="fas fa-${action.icon}"></i>
                ${action.label}
            </button>
        `).join('');
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const rolePermissions = {
            manager: ['task.*'],
            team_lead: ['task.edit', 'task.assign', 'task.comment', 'task.time-log'],
            developer: ['task.update', 'task.progress', 'task.comment'],
            viewer: []
        };

        const userPermissions = rolePermissions[this.currentUser.role] || [];
        return userPermissions.includes(permission) || 
               userPermissions.some(p => p.endsWith('*') && permission.startsWith(p.slice(0, -1)));
    }

    async executeTransition(taskId, toStatusId) {
        await this.updateTaskStatus(taskId, toStatusId);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the board when DOM is loaded
let board;
document.addEventListener('DOMContentLoaded', () => {
    board = new EnhancedKanbanBoard();
});

// Add required CSS
const kanbanStyles = document.createElement('style');
kanbanStyles.textContent = `
    #kanban-board {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        padding: 20px 0;
    }

    .kanban-column {
        min-width: 300px;
        background: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
    }

    .column-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e0e0e0;
    }

    .column-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .task-count {
        background: #e0e0e0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .column-tasks {
        min-height: 200px;
    }

    .task-card {
        background: white;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        cursor: grab;
        transition: all 0.2s;
    }

    .task-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .task-card.dragging {
        opacity: 0.5;
        cursor: grabbing;
    }

    .task-card.blocked {
        border-left: 4px solid #f44336;
    }

    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .task-id {
        font-size: 0.75rem;
        color: #999;
    }

    .task-title {
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
    }

    .task-description {
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 8px;
    }

    .task-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }

    .progress-bar-mini {
        flex: 1;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill-mini {
        height: 100%;
        background: #4caf50;
        transition: width 0.3s;
    }

    .progress-text {
        font-size: 0.75rem;
        color: #666;
        min-width: 35px;
    }

    .task-meta {
        display: flex;
        gap: 12px;
        font-size: 0.8rem;
        color: #666;
    }

    .task-assignee, .task-story-points, .task-due-date {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .task-due-date.overdue {
        color: #f44336;
    }

    .task-subtasks {
        font-size: 0.8rem;
        color: #666;
        margin-top: 8px;
    }

    .task-labels {
        display: flex;
        gap: 4px;
        margin-top: 8px;
        flex-wrap: wrap;
    }

    .label {
        background: #e3f2fd;
        color: #1976d2;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
    }

    .priority-urgent { border-top: 3px solid #f44336; }
    .priority-high { border-top: 3px solid #ff9800; }
    .priority-medium { border-top: 3px solid #2196f3; }
    .priority-low { border-top: 3px solid #4caf50; }

    .kanban-column.drag-over {
        background: #e3f2fd;
    }

    .transition-btn {
        padding: 6px 12px;
        margin: 4px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
    }

    .transition-btn:hover:not(.disabled) {
        background: #f5f5f5;
    }

    .transition-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .action-btn {
        padding: 8px 16px;
        margin: 4px;
        border: none;
        background: #f5f5f5;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .action-btn.danger {
        background: #ffebee;
        color: #c62828;
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
`;
document.head.appendChild(kanbanStyles);
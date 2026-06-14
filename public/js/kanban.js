$(document).ready(function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    $('#userName').text(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    $.ajaxSetup({
        headers: { 'Authorization': `Bearer ${token}` }
    });

    let currentProduct = null;
    let currentSprint = null;

    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    const sprintParam = urlParams.get('sprint');

    function loadProducts() {
        $.get('/api/products', function(response) {
            if (response.success) {
                const options = response.products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
                $('#productSelect').html('<option value="">Select Product</option>' + options);
                if (productParam) {
                    $('#productSelect').val(productParam);
                    currentProduct = productParam;
                    loadSprints();
                    loadTasks();
                }
            }
        });
    }

    function loadSprints() {
        if (!currentProduct) {
            $('#sprintSelect').html('<option value="">All Sprints</option>');
            return;
        }
        $.get(`/api/sprints?productId=${currentProduct}`, function(response) {
            if (response.success) {
                const options = response.sprints.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
                $('#sprintSelect').html('<option value="">All Sprints</option>' + options);
                if (sprintParam && !currentSprint) {
                    $('#sprintSelect').val(sprintParam);
                    currentSprint = sprintParam;
                    loadTasks();
                }
            }
        });
    }

    function loadTasks() {
        if (!currentProduct) return;

        let url = `/api/tasks?productId=${currentProduct}`;
        if (currentSprint) url += `&sprintId=${currentSprint}`;

        $.get(url, function(response) {
            if (response.success) {
                renderTasks(response.tasks);
            }
        });
    }

    function renderTasks(tasks) {
        ['todo', 'in-progress', 'testing', 'done'].forEach(status => {
            $(`#${status}Tasks`).empty();
        });

        const statusMap = {
            'todo': [],
            'in-progress': [],
            'testing': [],
            'done': []
        };

        tasks.forEach(task => {
            if (statusMap[task.status]) {
                statusMap[task.status].push(task);
            }
        });

        Object.keys(statusMap).forEach(status => {
            const container = $(`#${status}Tasks`);
            $(`#${status}Count`).text(statusMap[status].length);

            statusMap[status].forEach(task => {
                const assigneeName = task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned';
                container.append(createTaskCard(task, assigneeName));
            });
        });

        initSortable();
    }

    function createTaskCard(task, assigneeName) {
        const priorityClass = `priority-${task.priority}`;
        return `
            <div class="task-card" data-task-id="${task._id}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="priority-badge ${priorityClass}">${task.priority}</span>
                    ${task.storyPoints ? `<small class="text-muted">SP: ${task.storyPoints}</small>` : ''}
                </div>
                <h6 class="task-title mb-2">${task.title}</h6>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-person"></i> ${assigneeName}</small>
                    <button class="btn btn-sm btn-link p-0 view-task" data-id="${task._id}">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                ${task.dueDate ? `<small class="text-muted d-block mt-1"><i class="bi bi-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</small>` : ''}
            </div>
        `;
    }

    function initSortable() {
        $('.column-tasks').sortable({
            connectWith: '.column-tasks',
            placeholder: 'task-placeholder',
            forcePlaceholderSize: true,
            tolerance: 'pointer',
            start: function(e, ui) {
                ui.placeholder.height(ui.item.height());
            },
            stop: function(e, ui) {
                const taskId = ui.item.data('task-id');
                const newStatus = ui.item.closest('.kanban-column').data('status');

                if (taskId && newStatus) {
                    $.ajax({
                        url: `/api/tasks/${taskId}/status`,
                        method: 'PATCH',
                        contentType: 'application/json',
                        data: JSON.stringify({ status: newStatus })
                    }).done(function(response) {
                        if (response.success) {
                            showAlert('Task moved successfully', 'success');
                        }
                    });
                }
            }
        }).disableSelection();
    }

    function showAlert(message, type) {
        $('#alertContainer').html(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
    }

    $('#productSelect').on('change', function() {
        currentProduct = $(this).val();
        currentSprint = null;
        $('#sprintSelect').val('');
        loadSprints();
        loadTasks();
    });

    $('#sprintSelect').on('change', function() {
        currentSprint = $(this).val();
        loadTasks();
    });

    $('#createTaskBtn').on('click', async function() {
        if (!currentProduct) {
            showAlert('Please select a product first', 'danger');
            return;
        }

        const title = $('#taskTitle').val();
        const description = $('#taskDescription').val();
        const priority = $('#taskPriority').val();
        const storyPoints = $('#taskPoints').val();
        const dueDate = $('#taskDueDate').val();

        if (!title) {
            showAlert('Task title is required', 'danger');
            return;
        }

        try {
            const response = await $.ajax({
                url: '/api/tasks',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    title,
                    description,
                    productId: currentProduct,
                    sprintId: currentSprint || undefined,
                    priority,
                    storyPoints: parseInt(storyPoints) || undefined,
                    dueDate: dueDate || undefined
                })
            });

            if (response.success) {
                $('#createTaskModal').modal('hide');
                $('#createTaskForm')[0].reset();
                loadTasks();
                showAlert('Task created successfully', 'success');
            }
        } catch (error) {
            showAlert('Failed to create task', 'danger');
        }
    });

    $(document).on('click', '.view-task', async function() {
        const taskId = $(this).data('id');
        try {
            const response = await $.get(`/api/tasks/${taskId}`);
            if (response.success) {
                const task = response.task;
                $('#taskDetailTitle').text(task.title);
                $('#taskDetailBody').html(`
                    <p><strong>Description:</strong> ${task.description || 'No description'}</p>
                    <p><strong>Status:</strong> <span class="badge bg-primary">${task.status}</span></p>
                    <p><strong>Priority:</strong> <span class="badge bg-${task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'info'}">${task.priority}</span></p>
                    <p><strong>Assignee:</strong> ${task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</p>
                    <p><strong>Story Points:</strong> ${task.storyPoints || 'N/A'}</p>
                    <p><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
                    ${task.comments && task.comments.length > 0 ? '<h6>Comments:</h6>' + task.comments.map(c => `<div class="border-bottom py-2"><small><strong>${c.user.firstName} ${c.user.lastName}</strong> - ${new Date(c.createdAt).toLocaleString()}</small><p class="mb-0">${c.text}</p></div>`).join('') : ''}
                `);
                $('#deleteTaskBtn').data('id', taskId);
                $('#taskDetailModal').modal('show');
            }
        } catch (error) {
            showAlert('Failed to load task details', 'danger');
        }
    });

    $('#deleteTaskBtn').on('click', async function() {
        const taskId = $(this).data('id');
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await $.ajax({
                url: `/api/tasks/${taskId}`,
                method: 'DELETE'
            });
            $('#taskDetailModal').modal('hide');
            loadTasks();
            showAlert('Task deleted successfully', 'success');
        } catch (error) {
            showAlert('Failed to delete task', 'danger');
        }
    });

    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    loadProducts();
});
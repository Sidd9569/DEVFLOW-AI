$(document).ready(function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    $.ajaxSetup({
        headers: { 'Authorization': `Bearer ${token}` }
    });

    function loadAnalytics() {
        $.when(
            $.get('/api/tasks'),
            $.get('/api/issues'),
            $.get('/api/sprints'),
            $.get('/api/products')
        ).done(function(tasksRes, issuesRes, sprintsRes, productsRes) {
            const tasks = tasksRes[0].success ? tasksRes[0].tasks : [];
            const issues = issuesRes[0].success ? issuesRes[0].issues : [];
            const sprints = sprintsRes[0].success ? sprintsRes[0].sprints : [];
            const products = productsRes[0].success ? productsRes[0].products : [];

            renderCharts(tasks, issues, sprints, products);
            renderTeamPerformance(tasks);
            renderProductProgress(products, tasks);
        });
    }

    function renderCharts(tasks, issues, sprints, products) {
        const taskStatusCtx = document.getElementById('taskStatusChart');
        if (taskStatusCtx) {
            new Chart(taskStatusCtx, {
                type: 'bar',
                data: {
                    labels: ['Todo', 'In Progress', 'Testing', 'Done'],
                    datasets: [{
                        label: 'Tasks',
                        data: [
                            tasks.filter(t => t.status === 'todo').length,
                            tasks.filter(t => t.status === 'in-progress').length,
                            tasks.filter(t => t.status === 'testing').length,
                            tasks.filter(t => t.status === 'done').length
                        ],
                        backgroundColor: ['#0d6efd', '#ffc107', '#6f42c1', '#198754']
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        const issuePriorityCtx = document.getElementById('issuePriorityChart');
        if (issuePriorityCtx) {
            new Chart(issuePriorityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        data: [
                            issues.filter(i => i.priority === 'low').length,
                            issues.filter(i => i.priority === 'medium').length,
                            issues.filter(i => i.priority === 'high').length,
                            issues.filter(i => i.priority === 'critical').length
                        ],
                        backgroundColor: ['#198754', '#0d6efd', '#ffc107', '#dc3545']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }

        const sprintStatusCtx = document.getElementById('sprintStatusChart');
        if (sprintStatusCtx) {
            new Chart(sprintStatusCtx, {
                type: 'pie',
                data: {
                    labels: ['Planning', 'Active', 'Completed', 'Cancelled'],
                    datasets: [{
                        data: [
                            sprints.filter(s => s.status === 'planning').length,
                            sprints.filter(s => s.status === 'active').length,
                            sprints.filter(s => s.status === 'completed').length,
                            sprints.filter(s => s.status === 'cancelled').length
                        ],
                        backgroundColor: ['#6c757d', '#0dcaf0', '#198754', '#dc3545']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    function renderTeamPerformance(tasks) {
        const assignees = {};
        tasks.forEach(task => {
            if (task.assignee) {
                const name = `${task.assignee.firstName} ${task.assignee.lastName}`;
                if (!assignees[name]) {
                    assignees[name] = { total: 0, completed: 0, inProgress: 0 };
                }
                assignees[name].total++;
                if (task.status === 'done') assignees[name].completed++;
                if (task.status === 'in-progress' || task.status === 'testing') assignees[name].inProgress++;
            }
        });

        const ctx = document.getElementById('teamPerformanceChart');
        if (ctx && Object.keys(assignees).length > 0) {
            const names = Object.keys(assignees);
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: names,
                    datasets: [
                        {
                            label: 'Completed',
                            data: names.map(n => assignees[n].completed),
                            backgroundColor: '#198754'
                        },
                        {
                            label: 'In Progress',
                            data: names.map(n => assignees[n].inProgress),
                            backgroundColor: '#ffc107'
                        }
                    ]
                },
                options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
            });
        }
    }

    function renderProductProgress(products, tasks) {
        const ctx = document.getElementById('productProgressChart');
        if (ctx && products.length > 0) {
            const productNames = products.map(p => p.name);
            const completedTasks = products.map(p => tasks.filter(t => t.product === p._id && t.status === 'done').length);
            const totalTasks = products.map(p => tasks.filter(t => t.product === p._id).length);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: productNames,
                    datasets: [
                        {
                            label: 'Completed',
                            data: completedTasks,
                            backgroundColor: '#198754'
                        },
                        {
                            label: 'Remaining',
                            data: totalTasks.map((t, i) => t - completedTasks[i]),
                            backgroundColor: '#e9ecef'
                        }
                    ]
                },
                options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
            });
        }
    }

    loadAnalytics();
});
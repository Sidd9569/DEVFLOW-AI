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

    function loadDashboardStats() {
        loadUserDashboard();
    }

    // Load regular user dashboard
    function loadUserDashboard() {
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        $.ajaxSetup({
            headers: { Authorization: `Bearer ${token}` }
        });

        $.when(
            $.ajax({ url: '/api/tasks', method: 'GET', dataType: 'json' }),
            $.ajax({ url: '/api/issues', method: 'GET', dataType: 'json' }),
            $.ajax({ url: '/api/products', method: 'GET', dataType: 'json' }),
            $.ajax({ url: '/api/profile', method: 'GET', dataType: 'json' })
        ).done(function(tasksRes, issuesRes, productsRes, profileRes) {
            const tasks = tasksRes[0].success ? tasksRes[0].tasks : [];
            const issues = issuesRes[0].success ? issuesRes[0].issues : [];
            const products = productsRes[0].success ? productsRes[0].products : [];
            const profile = profileRes[0].success ? profileRes[0].user : { products: [] };

            $('#totalTasks').text(tasks.length);
            $('#completedTasks').text(tasks.filter(t => t.status === 'done').length);
            $('#inProgressTasks').text(tasks.filter(t => t.status === 'in-progress' || t.status === 'testing').length);
            $('#openIssues').text(issues.filter(i => i.status === 'open' || i.status === 'in-progress').length);
            const productCount = Array.isArray(profile.products)
                ? profile.products.length
                : (Array.isArray(products) ? products.length : 0);
            $('#totalProducts').text(productCount);

            const taskChartCtx = document.getElementById('taskChart').getContext('2d');
            new Chart(taskChartCtx, {
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
                        backgroundColor: [
                            'rgba(13, 110, 253, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(111, 66, 193, 0.7)',
                            'rgba(25, 135, 84, 0.7)'
                        ],
                        borderColor: [
                            'rgb(13, 110, 253)',
                            'rgb(255, 193, 7)',
                            'rgb(111, 66, 193)',
                            'rgb(25, 135, 84)'
                        ],
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });

            const distChartCtx = document.getElementById('distributionChart').getContext('2d');
            new Chart(distChartCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        data: [
                            tasks.filter(t => t.priority === 'low').length,
                            tasks.filter(t => t.priority === 'medium').length,
                            tasks.filter(t => t.priority === 'high').length,
                            tasks.filter(t => t.priority === 'critical').length
                        ],
                        backgroundColor: [
                            'rgba(25, 135, 84, 0.7)',
                            'rgba(13, 110, 253, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(220, 53, 69, 0.7)'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });

            const productsList = $('#productsList');
            if (products.length === 0) {
                productsList.html('<p class="text-muted">No products yet. <a href="/products.html">Create one</a></p>');
            } else {
                products.slice(0, 3).forEach(p => {
                    productsList.append(`
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                                <strong>${p.name}</strong>
                                <p class="text-muted small mb-0">${p.description || 'No description'}</p>
                            </div>
                            <span class="badge bg-${p.status === 'active' ? 'success' : 'info'}">${p.status}</span>
                        </div>
                    `);
                });
            }

            loadActivity();
        }).fail(function(xhr, status, error) {
            console.error('Failed to load dashboard data', status, error, xhr.status, xhr.responseText);
            if (xhr.status === 401 || xhr.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                return;
            }
            console.log('Failed to load dashboard data');
        });
    }

    function loadActivity() {
        $.get('/api/profile/activity?limit=5', function(response) {
            if (response.success) {
                const container = $('#recentActivity');
                if (response.activities.length === 0) {
                    container.html('<p class="text-muted">No recent activity</p>');
                    return;
                }
                response.activities.forEach(a => {
                    container.append(`
                        <div class="d-flex align-items-start py-2 border-bottom">
                            <i class="bi bi-circle-fill small me-2 mt-1 text-primary" style="font-size: 6px;"></i>
                            <div>
                                <p class="mb-0 small">${a.action} ${a.entityType}: ${a.entityName || 'N/A'}</p>
                                <small class="text-muted">${new Date(a.createdAt).toLocaleString()}</small>
                            </div>
                        </div>
                    `);
                });
            }
        });
    }

    // Handle view issue button click
    $(document).on('click', '.view-issue', function() {
        const issueId = $(this).data('id');
        window.location.href = `/issues?id=${issueId}`;
    });

    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    loadDashboardStats();
});
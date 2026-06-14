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

    function loadProducts() {
        $.get('/api/products', function(response) {
            if (response.success) {
                const options = response.products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
                $('#productFilter').html('<option value="">All Products</option>' + options);
                $('#issueProduct').html('<option value="">Select Product</option>' + options);
            }
        });
    }

    function loadIssues() {
        const productId = $('#productFilter').val();
        const url = productId ? `/api/issues?productId=${productId}` : '/api/issues';

        $.get(url, function(response) {
            if (response.success) {
                const issues = response.issues;
                renderIssues(issues);
                updateStats(issues);
            }
        });
    }

    function renderIssues(issues) {
        const tbody = $('#issuesTable');
        tbody.empty();

        if (issues.length === 0) {
            tbody.html('<tr><td colspan="9" class="text-center text-muted">No issues found</td></tr>');
            return;
        }

        issues.forEach((issue, index) => {
            const typeClass = issue.type === 'bug' ? 'danger' : issue.type === 'feature' ? 'success' : 'info';
            const priorityClass = issue.priority === 'critical' ? 'danger' : issue.priority === 'high' ? 'warning' : 'info';
            const statusClass = issue.status === 'open' ? 'danger' : issue.status === 'in-progress' ? 'warning' : issue.status === 'resolved' ? 'success' : 'secondary';

            tbody.append(`
                <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>
                        <a href="#" class="text-decoration-none view-issue" data-id="${issue._id}">
                            ${issue.title}
                        </a>
                    </td>
                    <td><span class="badge bg-${typeClass}">${issue.type}</span></td>
                    <td><span class="badge bg-${priorityClass}">${issue.priority}</span></td>
                    <td><span class="badge bg-${statusClass}">${issue.status}</span></td>
                    <td>${issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : 'Unassigned'}</td>
                    <td>${issue.reporter ? `${issue.reporter.firstName} ${issue.reporter.lastName}` : 'Unknown'}</td>
                    <td>${new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-issue" data-id="${issue._id}">View</button>
                    </td>
                </tr>
            `);
        });
    }

    function updateStats(issues) {
        $('#totalIssues').text(issues.length);
        $('#openIssues').text(issues.filter(i => i.status === 'open').length);
        $('#inProgressIssues').text(issues.filter(i => i.status === 'in-progress').length);
        $('#resolvedIssues').text(issues.filter(i => i.status === 'resolved').length);
        $('#criticalIssues').text(issues.filter(i => i.priority === 'critical' && i.status !== 'resolved').length);
        $('#bugIssues').text(issues.filter(i => i.type === 'bug').length);
    }

    function showAlert(message, type) {
        $('#alertContainer').html(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
    }

    loadProducts();
    loadIssues();

    $('#productFilter').on('change', loadIssues);

    $('#createIssueBtn').on('click', async function() {
        const productId = $('#issueProduct').val();
        const title = $('#issueTitle').val();
        const description = $('#issueDescription').val();
        const type = $('#issueType').val();
        const priority = $('#issuePriority').val();

        if (!productId || !title) {
            showAlert('Please fill all required fields', 'danger');
            return;
        }

        try {
            const response = await $.ajax({
                url: '/api/issues',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    title,
                    description,
                    productId,
                    type,
                    priority
                })
            });

            if (response.success) {
                $('#createIssueModal').modal('hide');
                $('#createIssueForm')[0].reset();
                loadIssues();
                showAlert('Issue created successfully', 'success');
            }
        } catch (error) {
            showAlert('Failed to create issue', 'danger');
        }
    });

    $(document).on('click', '.view-issue', async function() {
        const issueId = $(this).data('id');
        try {
            const response = await $.get(`/api/issues/${issueId}`);
            if (response.success) {
                const issue = response.issue;
                $('#issueDetailTitle').text(issue.title);
                $('#issueDetailBody').html(`
                    <div class="row">
                        <div class="col-md-8">
                            <p><strong>Description:</strong></p>
                            <p>${issue.description || 'No description provided'}</p>
                        </div>
                        <div class="col-md-4">
                            <table class="table table-sm">
                                <tr>
                                    <th>Status</th>
                                    <td><span class="badge bg-${issue.status === 'open' ? 'danger' : issue.status === 'in-progress' ? 'warning' : 'success'}">${issue.status}</span></td>
                                </tr>
                                <tr>
                                    <th>Priority</th>
                                    <td><span class="badge bg-${issue.priority === 'critical' ? 'danger' : issue.priority === 'high' ? 'warning' : 'info'}">${issue.priority}</span></td>
                                </tr>
                                <tr>
                                    <th>Type</th>
                                    <td><span class="badge bg-${issue.type === 'bug' ? 'danger' : 'success'}">${issue.type}</span></td>
                                </tr>
                                <tr>
                                    <th>Assignee</th>
                                    <td>${issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : 'Unassigned'}</td>
                                </tr>
                                <tr>
                                    <th>Due Date</th>
                                    <td>${issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'Not set'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ${issue.comments && issue.comments.length > 0 ? '<h6 class="mt-3">Comments:</h6>' + issue.comments.map(c => `<div class="border-bottom py-2"><small><strong>${c.user.firstName} ${c.user.lastName}</strong> - ${new Date(c.createdAt).toLocaleString()}</small><p class="mb-0">${c.text}</p></div>`).join('') : ''}
                `);
                $('#issueDetailModal').modal('show');
            }
        } catch (error) {
            showAlert('Failed to load issue details', 'danger');
        }
    });

    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });
});
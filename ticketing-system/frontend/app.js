/**
 * Ticketing System Simulator - Frontend Application
 * Handles all UI interactions and API communication
 */

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:5000/api';

// ==================== STATE ====================
let currentView = 'dashboard';
let currentTicket = null;
let currentPage = 1;
let currentSort = { field: 'created_at', order: 'desc' };
let filters = {};

// Data caches
let categories = [];
let agents = [];
let customers = [];

// ==================== DOM ELEMENTS ====================
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    viewSections: document.querySelectorAll('.view-section'),
    pageTitle: document.getElementById('page-title'),
    
    // Dashboard
    stats: {
        total: document.getElementById('stat-total'),
        open: document.getElementById('stat-open'),
        progress: document.getElementById('stat-progress'),
        resolved: document.getElementById('stat-resolved'),
        critical: document.getElementById('stat-critical'),
        overdue: document.getElementById('stat-overdue')
    },
    recentTicketsBody: document.getElementById('recent-tickets-body'),
    
    // Tickets List
    ticketsBody: document.getElementById('tickets-body'),
    pagination: document.getElementById('pagination'),
    filterStatus: document.getElementById('filter-status'),
    filterPriority: document.getElementById('filter-priority'),
    filterCategory: document.getElementById('filter-category'),
    filterAgent: document.getElementById('filter-agent'),
    clearFiltersBtn: document.getElementById('clear-filters'),
    searchInput: document.getElementById('search-input'),
    
    // Create Ticket
    ticketForm: document.getElementById('ticket-form'),
    ticketTitle: document.getElementById('ticket-title'),
    ticketCategory: document.getElementById('ticket-category'),
    ticketPriority: document.getElementById('ticket-priority'),
    ticketAssignee: document.getElementById('ticket-assignee'),
    ticketDescription: document.getElementById('ticket-description'),
    ticketCreator: document.getElementById('ticket-creator'),
    cancelTicketBtn: document.getElementById('cancel-ticket'),
    
    // Modal
    modal: document.getElementById('ticket-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    modalTicketNumber: document.getElementById('modal-ticket-number'),
    modalTitle: document.getElementById('modal-title'),
    modalPriority: document.getElementById('modal-priority'),
    modalStatus: document.getElementById('modal-status'),
    modalCategory: document.getElementById('modal-category'),
    modalDescription: document.getElementById('modal-description'),
    modalCreated: document.getElementById('modal-created'),
    modalCreator: document.getElementById('modal-creator'),
    modalAgent: document.getElementById('modal-agent'),
    modalDueDate: document.getElementById('modal-due-date'),
    modalResolved: document.getElementById('modal-resolved'),
    modalStatusSelect: document.getElementById('modal-status-select'),
    modalPrioritySelect: document.getElementById('modal-priority-select'),
    modalAssigneeSelect: document.getElementById('modal-assignee-select'),
    saveChangesBtn: document.getElementById('save-changes'),
    deleteTicketBtn: document.getElementById('delete-ticket'),
    commentsList: document.getElementById('comments-list'),
    commentContent: document.getElementById('comment-content'),
    commentInternal: document.getElementById('comment-internal'),
    addCommentBtn: document.getElementById('add-comment-btn'),
    historyList: document.getElementById('history-list'),
    
    // Badges
    unassignedCount: document.getElementById('unassigned-count'),
    overdueCount: document.getElementById('overdue-count'),
    
    // Buttons
    newTicketBtn: document.getElementById('new-ticket-btn'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
}

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.className = `toast ${type}`;
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// ==================== API FUNCTIONS ====================

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        return null;
    }
}

// Dashboard
async function fetchDashboardStats() {
    return await apiCall('/dashboard/stats');
}

async function fetchRecentTickets() {
    return await apiCall('/tickets?per_page=5&sort_by=created_at&sort_order=desc');
}

// Tickets
async function fetchTickets(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.assigned_to) queryParams.append('assigned_to', params.assigned_to);
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    
    return await apiCall(`/tickets?${queryParams.toString()}`);
}

async function fetchTicket(id) {
    return await apiCall(`/tickets/${id}`);
}

async function createTicket(data) {
    return await apiCall('/tickets', 'POST', data);
}

async function updateTicket(id, data) {
    return await apiCall(`/tickets/${id}`, 'PUT', data);
}

async function deleteTicket(id) {
    return await apiCall(`/tickets/${id}`, 'DELETE');
}

async function fetchOverdueTickets() {
    return await apiCall('/tickets/overdue');
}

async function fetchUnassignedTickets() {
    return await apiCall('/tickets/unassigned');
}

async function assignTicket(id, agentId) {
    return await apiCall(`/tickets/${id}/assign`, 'POST', { agent_id: agentId });
}

// Comments
async function addComment(ticketId, content, isInternal = false, userId = 1) {
    return await apiCall(`/tickets/${ticketId}/comments`, 'POST', {
        content,
        is_internal: isInternal,
        user_id: userId
    });
}

// History
async function fetchTicketHistory(ticketId) {
    return await apiCall(`/tickets/${ticketId}/history`);
}

// Categories & Users
async function fetchCategories() {
    return await apiCall('/categories');
}

async function fetchUsers(role = null) {
    const query = role ? `?role=${role}` : '';
    return await apiCall(`/users${query}`);
}

// ==================== RENDER FUNCTIONS ====================

function renderPriorityBadge(priority) {
    return `<span class="priority-badge ${priority}">${priority}</span>`;
}

function renderStatusBadge(status) {
    const statusLabels = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'pending_customer': 'Pending',
        'resolved': 'Resolved',
        'closed': 'Closed'
    };
    return `<span class="status-badge ${status}">${statusLabels[status] || status}</span>`;
}

function renderDashboard(stats, tickets) {
    // Update stats
    elements.stats.total.textContent = stats.total_tickets || 0;
    elements.stats.open.textContent = stats.open_tickets || 0;
    elements.stats.progress.textContent = stats.in_progress || 0;
    elements.stats.resolved.textContent = stats.resolved || 0;
    elements.stats.critical.textContent = stats.critical_tickets || 0;
    elements.stats.overdue.textContent = stats.overdue || 0;
    
    // Update badges
    elements.unassignedCount.textContent = tickets.unassigned || 0;
    elements.overdueCount.textContent = stats.overdue || 0;
    
    // Render recent tickets
    const tbody = elements.recentTicketsBody;
    tbody.innerHTML = '';
    
    if (!tickets.data || tickets.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-secondary);">No tickets found</td></tr>';
        return;
    }
    
    tickets.data.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${ticket.ticket_number}</strong></td>
            <td>${escapeHtml(ticket.title)}</td>
            <td>${renderPriorityBadge(ticket.priority)}</td>
            <td>${renderStatusBadge(ticket.status)}</td>
            <td>${ticket.category ? escapeHtml(ticket.category.name) : '-'}</td>
            <td>${ticket.agent ? escapeHtml(ticket.agent.name) : '<span style="color:var(--text-light);">Unassigned</span>'}</td>
            <td>${formatRelativeTime(ticket.created_at)}</td>
        `;
        row.addEventListener('click', () => openTicketModal(ticket.id));
        tbody.appendChild(row);
    });
}

function renderTicketsList(response) {
    const tbody = elements.ticketsBody;
    tbody.innerHTML = '';
    
    if (!response.tickets || response.tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-secondary);">No tickets found</td></tr>';
        renderPagination(0, 1);
        return;
    }
    
    response.tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${ticket.ticket_number}</strong></td>
            <td>${escapeHtml(ticket.title)}</td>
            <td>${renderPriorityBadge(ticket.priority)}</td>
            <td>${renderStatusBadge(ticket.status)}</td>
            <td>${ticket.category ? escapeHtml(ticket.category.name) : '-'}</td>
            <td>${ticket.agent ? escapeHtml(ticket.agent.name) : '<span style="color:var(--text-light);">Unassigned</span>'}</td>
            <td>${formatRelativeTime(ticket.created_at)}</td>
            <td>
                <button class="action-btn view" onclick="event.stopPropagation(); openTicketModal(${ticket.id})">View</button>
            </td>
        `;
        row.addEventListener('click', () => openTicketModal(ticket.id));
        tbody.appendChild(row);
    });
    
    renderPagination(response.pages, response.current_page);
}

function renderPagination(totalPages, currentPage) {
    const container = elements.pagination;
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            loadTickets(currentPage - 1);
        }
    });
    container.appendChild(prevBtn);
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.addEventListener('click', () => loadTickets(i));
        container.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            loadTickets(currentPage + 1);
        }
    });
    container.appendChild(nextBtn);
}

function renderTicketModal(ticket) {
    currentTicket = ticket;
    
    elements.modalTicketNumber.textContent = ticket.ticket_number;
    elements.modalTitle.textContent = ticket.title;
    elements.modalPriority.className = `priority-badge ${ticket.priority}`;
    elements.modalPriority.textContent = ticket.priority;
    elements.modalStatus.className = `status-badge ${ticket.status}`;
    elements.modalStatus.textContent = ticket.status;
    elements.modalCategory.textContent = ticket.category ? ticket.category.name : '-';
    elements.modalDescription.textContent = ticket.description;
    
    elements.modalCreated.textContent = formatDate(ticket.created_at);
    elements.modalCreator.textContent = ticket.creator ? ticket.creator.name : '-';
    elements.modalAgent.textContent = ticket.agent ? ticket.agent.name : 'Unassigned';
    elements.modalDueDate.textContent = formatDate(ticket.due_date);
    elements.modalResolved.textContent = formatDate(ticket.resolved_at);
    
    // Set select values
    elements.modalStatusSelect.value = ticket.status;
    elements.modalPrioritySelect.value = ticket.priority;
    elements.modalAssigneeSelect.value = ticket.assigned_to || '';
    
    // Render comments
    renderComments(ticket.comments || []);
    
    // Render history
    loadTicketHistory(ticket.id);
    
    // Show modal
    elements.modal.classList.remove('hidden');
}

function renderComments(comments) {
    const container = elements.commentsList;
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">No comments yet</p>';
        return;
    }
    
    comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = `comment-item${comment.is_internal ? ' internal' : ''}`;
        div.innerHTML = `
            <div class="comment-avatar">${getInitials(comment.user ? comment.user.name : 'U')}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.user ? escapeHtml(comment.user.name) : 'Unknown'}</span>
                    <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
                    ${comment.is_internal ? '<span class="comment-badge">Internal</span>' : ''}
                </div>
                <p class="comment-text">${escapeHtml(comment.content)}</p>
            </div>
        `;
        container.appendChild(div);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function renderHistory(history) {
    const container = elements.historyList;
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.875rem;">No history available</p>';
        return;
    }
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let actionText = '';
        switch (item.action) {
            case 'created':
                actionText = 'Ticket created';
                break;
            case 'updated':
                actionText = `Updated <strong>${item.field}</strong> from "${item.old_value}" to "${item.new_value}"`;
                break;
            case 'assigned':
                actionText = `Assigned to agent (ID: ${item.new_value})`;
                break;
            case 'comment_added':
                actionText = 'Comment added';
                break;
            default:
                actionText = item.action;
        }
        
        div.innerHTML = `
            <span class="history-time">${formatRelativeTime(item.created_at)}</span>
            <span class="history-text">${actionText}</span>
        `;
        container.appendChild(div);
    });
}

function populateSelectOptions() {
    // Categories
    const categoryOptions = categories.map(c => 
        `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');
    
    elements.ticketCategory.innerHTML = '<option value="">Select a category</option>' + categoryOptions;
    elements.filterCategory.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
    
    // Agents
    const agentOptions = agents.map(a => 
        `<option value="${a.id}">${escapeHtml(a.name)} (${a.department || 'General'})</option>`
    ).join('');
    
    elements.ticketAssignee.innerHTML = '<option value="">-- Unassigned --</option>' + agentOptions;
    elements.filterAgent.innerHTML = '<option value="">All Agents</option>' + agentOptions;
    elements.modalAssigneeSelect.innerHTML = '<option value="">-- Unassigned --</option>' + agentOptions;
    
    // Customers (for creator)
    const customerOptions = customers.map(c => 
        `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');
    
    elements.ticketCreator.innerHTML = customerOptions;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== VIEW MANAGEMENT ====================

function switchView(viewName) {
    currentView = viewName;
    
    // Update navigation
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'tickets': 'All Tickets',
        'create': 'Create New Ticket',
        'unassigned': 'Unassigned Tickets',
        'overdue': 'Overdue Tickets'
    };
    elements.pageTitle.textContent = titles[viewName] || 'Dashboard';
    
    // Show/hide sections
    elements.viewSections.forEach(section => {
        section.classList.add('hidden');
    });
    
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
        viewElement.classList.remove('hidden');
    }
    
    // Load data based on view
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tickets':
            loadTickets(1);
            break;
        case 'unassigned':
            loadUnassignedTickets();
            break;
        case 'overdue':
            loadOverdueTickets();
            break;
        case 'create':
            // Reset form
            elements.ticketForm.reset();
            break;
    }
}

// ==================== DATA LOADING ====================

async function loadDashboard() {
    const [stats, tickets] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentTickets()
    ]);
    
    if (stats && tickets) {
        renderDashboard(stats, tickets);
    }
}

async function loadTickets(page = 1) {
    currentPage = page;
    
    const params = {
        page,
        per_page: 10,
        sort_by: currentSort.field,
        sort_order: currentSort.order,
        ...filters
    };
    
    const searchQuery = elements.searchInput.value.trim();
    if (searchQuery) {
        params.search = searchQuery;
    }
    
    const response = await fetchTickets(params);
    if (response) {
        renderTicketsList(response);
    }
}

async function loadUnassignedTickets() {
    const tickets = await fetchUnassignedTickets();
    if (tickets) {
        const response = {
            tickets,
            pages: 1,
            current_page: 1
        };
        renderTicketsList(response);
    }
}

async function loadOverdueTickets() {
    const tickets = await fetchOverdueTickets();
    if (tickets) {
        const response = {
            tickets,
            pages: 1,
            current_page: 1
        };
        renderTicketsList(response);
    }
}

async function loadTicketHistory(ticketId) {
    const history = await fetchTicketHistory(ticketId);
    if (history) {
        renderHistory(history);
    }
}

async function openTicketModal(ticketId) {
    const ticket = await fetchTicket(ticketId);
    if (ticket) {
        renderTicketModal(ticket);
    }
}

async function loadInitialData() {
    try {
        // Load categories and users
        const [cats, allUsers] = await Promise.all([
            fetchCategories(),
            fetchUsers()
        ]);
        
        if (cats) {
            categories = cats;
        }
        
        if (allUsers) {
            agents = allUsers.filter(u => u.role === 'agent' || u.role === 'admin');
            customers = allUsers.filter(u => u.role === 'customer');
        }
        
        populateSelectOptions();
        loadDashboard();
        
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showToast('Failed to load data. Make sure the backend is running.', 'error');
    }
}

// ==================== EVENT HANDLERS ====================

function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) {
                switchView(view);
            }
        });
    });
    
    // View all link in dashboard
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (view) {
                switchView(view);
            }
        });
    });
    
    // New ticket button
    elements.newTicketBtn.addEventListener('click', () => {
        switchView('create');
    });
    
    // Create ticket form
    elements.ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            title: elements.ticketTitle.value,
            description: elements.ticketDescription.value,
            category_id: parseInt(elements.ticketCategory.value),
            priority: elements.ticketPriority.value,
            created_by: parseInt(elements.ticketCreator.value),
            assigned_to: elements.ticketAssignee.value ? parseInt(elements.ticketAssignee.value) : null
        };
        
        const ticket = await createTicket(data);
        if (ticket) {
            showToast(`Ticket ${ticket.ticket_number} created successfully!`, 'success');
            switchView('dashboard');
        }
    });
    
    // Cancel ticket creation
    elements.cancelTicketBtn.addEventListener('click', () => {
        switchView('dashboard');
    });
    
    // Filters
    elements.filterStatus.addEventListener('change', () => {
        filters.status = elements.filterStatus.value || undefined;
        loadTickets(1);
    });
    
    elements.filterPriority.addEventListener('change', () => {
        filters.priority = elements.filterPriority.value || undefined;
        loadTickets(1);
    });
    
    elements.filterCategory.addEventListener('change', () => {
        filters.category_id = elements.filterCategory.value || undefined;
        loadTickets(1);
    });
    
    elements.filterAgent.addEventListener('change', () => {
        filters.assigned_to = elements.filterAgent.value || undefined;
        loadTickets(1);
    });
    
    elements.clearFiltersBtn.addEventListener('click', () => {
        filters = {};
        elements.filterStatus.value = '';
        elements.filterPriority.value = '';
        elements.filterCategory.value = '';
        elements.filterAgent.value = '';
        loadTickets(1);
    });
    
    // Search
    let searchTimeout;
    elements.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadTickets(1);
        }, 300);
    });
    
    // Sorting
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (currentSort.field === field) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.order = 'desc';
            }
            loadTickets(1);
        });
    });
    
    // Modal
    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.classList.add('hidden');
        currentTicket = null;
    });
    
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.classList.add('hidden');
            currentTicket = null;
        }
    });
    
    // Save changes
    elements.saveChangesBtn.addEventListener('click', async () => {
        if (!currentTicket) return;
        
        const data = {
            status: elements.modalStatusSelect.value,
            priority: elements.modalPrioritySelect.value,
            assigned_to: elements.modalAssigneeSelect.value ? parseInt(elements.modalAssigneeSelect.value) : null,
            updated_by: 1 // Admin user
        };
        
        const ticket = await updateTicket(currentTicket.id, data);
        if (ticket) {
            showToast('Ticket updated successfully!', 'success');
            renderTicketModal(ticket);
            loadDashboard(); // Refresh dashboard stats
            
            // Refresh current view if needed
            if (currentView === 'tickets') {
                loadTickets(currentPage);
            }
        }
    });
    
    // Delete ticket
    elements.deleteTicketBtn.addEventListener('click', async () => {
        if (!currentTicket) return;
        
        if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            const result = await deleteTicket(currentTicket.id);
            if (result) {
                showToast('Ticket deleted successfully!', 'success');
                elements.modal.classList.add('hidden');
                currentTicket = null;
                loadDashboard();
                
                if (currentView === 'tickets') {
                    loadTickets(currentPage);
                }
            }
        }
    });
    
    // Add comment
    elements.addCommentBtn.addEventListener('click', async () => {
        if (!currentTicket) return;
        
        const content = elements.commentContent.value.trim();
        if (!content) {
            showToast('Please enter a comment', 'error');
            return;
        }
        
        const isInternal = elements.commentInternal.checked;
        const comment = await addComment(currentTicket.id, content, isInternal, 1);
        
        if (comment) {
            showToast('Comment added successfully!', 'success');
            elements.commentContent.value = '';
            elements.commentInternal.checked = false;
            
            // Refresh ticket data
            const ticket = await fetchTicket(currentTicket.id);
            if (ticket) {
                renderTicketModal(ticket);
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            elements.modal.classList.add('hidden');
            currentTicket = null;
        }
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadInitialData();
});
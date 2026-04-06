"""
Automated Ticketing System Simulator
Backend API with Flask and SQLite
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ticketing.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==================== DATABASE MODELS ====================

class User(db.Model):
    """User model for agents and customers"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default='customer')  # admin, agent, customer
    department = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    assigned_tickets = db.relationship('Ticket', backref='agent', lazy=True, 
                                        foreign_keys='Ticket.assigned_to')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'department': self.department,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Category(db.Model):
    """Ticket categories"""
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=True)
    color = db.Column(db.String(7), default='#6c757d')  # Hex color for UI
    sla_hours = db.Column(db.Integer, default=24)  # Service Level Agreement hours
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'sla_hours': self.sla_hours
        }


class Ticket(db.Model):
    """Main ticket model"""
    __tablename__ = 'tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # Priority: low, medium, high, critical
    priority = db.Column(db.String(20), nullable=False, default='medium')
    
    # Status: open, in_progress, pending_customer, resolved, closed
    status = db.Column(db.String(20), nullable=False, default='open')
    
    # Foreign keys
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    category = db.relationship('Category', backref=db.backref('tickets', lazy=True))
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_tickets')
    comments = db.relationship('Comment', backref='ticket', lazy=True, 
                               order_by='Comment.created_at.desc()')
    attachments = db.relationship('Attachment', backref='ticket', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticket_number': self.ticket_number,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'created_by': self.created_by,
            'creator': self.creator.to_dict() if self.creator else None,
            'assigned_to': self.assigned_to,
            'agent': self.agent.to_dict() if self.agent else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'comments': [c.to_dict() for c in self.comments],
            'attachments': [a.to_dict() for a in self.attachments]
        }
    
    def generate_ticket_number(self):
        """Generate unique ticket number like TKT-2024-0001"""
        year = datetime.now().year
        last_ticket = Ticket.query.filter(
            Ticket.ticket_number.like(f'TKT-{year}-%')
        ).order_by(Ticket.id.desc()).first()
        
        if last_ticket:
            last_num = int(last_ticket.ticket_number.split('-')[-1])
            return f'TKT-{year}-{last_num + 1:04d}'
        return f'TKT-{year}-0001'


class Comment(db.Model):
    """Comments on tickets"""
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False)  # Internal notes vs customer replies
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='comments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'content': self.content,
            'is_internal': self.is_internal,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Attachment(db.Model):
    """File attachments for tickets"""
    __tablename__ = 'attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='attachments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'filename': self.filename,
            'file_size': self.file_size,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TicketHistory(db.Model):
    """Audit trail for ticket changes"""
    __tablename__ = 'ticket_history'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # created, updated, assigned, status_changed, etc.
    field = db.Column(db.String(50), nullable=True)
    old_value = db.Column(db.String(500), nullable=True)
    new_value = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    ticket = db.relationship('Ticket', backref='history')
    user = db.relationship('User', backref='history')
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'action': self.action,
            'field': self.field,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# ==================== HELPER FUNCTIONS ====================

def add_ticket_history(ticket_id, user_id, action, field=None, old_value=None, new_value=None):
    """Add entry to ticket history"""
    history = TicketHistory(
        ticket_id=ticket_id,
        user_id=user_id,
        action=action,
        field=field,
        old_value=str(old_value) if old_value else None,
        new_value=str(new_value) if new_value else None
    )
    db.session.add(history)
    db.session.commit()


def calculate_due_date(category_id, priority):
    """Calculate due date based on category SLA and priority"""
    category = Category.query.get(category_id)
    if not category:
        return datetime.utcnow() + timedelta(hours=24)
    
    # Priority multipliers
    priority_multipliers = {
        'low': 2.0,
        'medium': 1.0,
        'high': 0.5,
        'critical': 0.25
    }
    
    multiplier = priority_multipliers.get(priority, 1.0)
    sla_hours = category.sla_hours * multiplier
    
    return datetime.utcnow() + timedelta(hours=sla_hours)


# ==================== API ROUTES ====================

# ---- User Routes ----

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users with optional filtering"""
    role = request.args.get('role')
    department = request.args.get('department')
    
    query = User.query.filter_by(is_active=True)
    
    if role:
        query = query.filter_by(role=role)
    if department:
        query = query.filter_by(department=department)
    
    users = query.all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    required_fields = ['name', 'email', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        name=data['name'],
        email=data['email'],
        role=data['role'],
        department=data.get('department')
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201


# ---- Category Routes ----

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories])


@app.route('/api/categories', methods=['POST'])
def create_category():
    """Create a new category"""
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': 'Category name is required'}), 400
    
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Category already exists'}), 400
    
    category = Category(
        name=data['name'],
        description=data.get('description'),
        color=data.get('color', '#6c757d'),
        sla_hours=data.get('sla_hours', 24)
    )
    db.session.add(category)
    db.session.commit()
    
    return jsonify(category.to_dict()), 201


# ---- Ticket Routes ----

@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    """Get all tickets with filtering, sorting, and pagination"""
    # Filtering
    status = request.args.get('status')
    priority = request.args.get('priority')
    category_id = request.args.get('category_id')
    assigned_to = request.args.get('assigned_to')
    created_by = request.args.get('created_by')
    search = request.args.get('search')
    
    # Sorting
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Ticket.query
    
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if assigned_to:
        query = query.filter_by(assigned_to=assigned_to)
    if created_by:
        query = query.filter_by(created_by=created_by)
    if search:
        query = query.filter(
            (Ticket.title.ilike(f'%{search}%')) |
            (Ticket.description.ilike(f'%{search}%')) |
            (Ticket.ticket_number.ilike(f'%{search}%'))
        )
    
    # Sorting
    sort_column = getattr(Ticket, sort_by, Ticket.created_at)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Pagination
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'tickets': [t.to_dict() for t in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
        'per_page': per_page
    })


@app.route('/api/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    """Get a single ticket by ID"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    return jsonify(ticket.to_dict())


@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    """Create a new ticket"""
    data = request.get_json()
    
    required_fields = ['title', 'description', 'category_id', 'created_by']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate category exists
    category = Category.query.get(data['category_id'])
    if not category:
        return jsonify({'error': 'Category not found'}), 400
    
    # Validate user exists
    user = User.query.get(data['created_by'])
    if not user:
        return jsonify({'error': 'User not found'}), 400
    
    priority = data.get('priority', 'medium')
    
    ticket = Ticket(
        ticket_number='',  # Will be generated
        title=data['title'],
        description=data['description'],
        priority=priority,
        status='open',
        category_id=data['category_id'],
        created_by=data['created_by'],
        assigned_to=data.get('assigned_to'),
        due_date=calculate_due_date(data['category_id'], priority)
    )
    ticket.ticket_number = ticket.generate_ticket_number()
    
    db.session.add(ticket)
    db.session.commit()
    
    # Add history
    add_ticket_history(ticket.id, data['created_by'], 'created')
    
    return jsonify(ticket.to_dict()), 201


@app.route('/api/tickets/<int:ticket_id>', methods=['PUT'])
def update_ticket(ticket_id):
    """Update a ticket"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    
    # Track changes for history
    changes = []
    
    # Updateable fields
    updatable_fields = ['title', 'description', 'priority', 'status', 'assigned_to']
    
    for field in updatable_fields:
        if field in data and getattr(ticket, field) != data[field]:
            old_value = getattr(ticket, field)
            changes.append({
                'field': field,
                'old_value': old_value,
                'new_value': data[field]
            })
            setattr(ticket, field, data[field])
    
    # Handle status-specific logic
    if 'status' in data:
        if data['status'] == 'resolved':
            ticket.resolved_at = datetime.utcnow()
            changes.append({'field': 'resolved_at', 'old_value': None, 'new_value': 'now'})
        elif data['status'] == 'closed':
            if not ticket.resolved_at:
                ticket.resolved_at = datetime.utcnow()
    
    # Recalculate due date if priority or category changes
    if 'priority' in data or 'category_id' in data:
        ticket.due_date = calculate_due_date(
            data.get('category_id', ticket.category_id),
            data.get('priority', ticket.priority)
        )
    
    db.session.commit()
    
    # Add history for each change
    user_id = data.get('updated_by', data.get('created_by', 1))
    for change in changes:
        add_ticket_history(
            ticket.id, 
            user_id, 
            'updated', 
            change['field'], 
            change['old_value'], 
            change['new_value']
        )
    
    return jsonify(ticket.to_dict())


@app.route('/api/tickets/<int:ticket_id>', methods=['DELETE'])
def delete_ticket(ticket_id):
    """Delete a ticket (soft delete by changing status)"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    # Soft delete - just close the ticket
    ticket.status = 'closed'
    db.session.commit()
    
    return jsonify({'message': 'Ticket deleted successfully'})


# ---- Comment Routes ----

@app.route('/api/tickets/<int:ticket_id>/comments', methods=['GET'])
def get_ticket_comments(ticket_id):
    """Get all comments for a ticket"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    return jsonify([c.to_dict() for c in ticket.comments])


@app.route('/api/tickets/<int:ticket_id>/comments', methods=['POST'])
def add_comment(ticket_id):
    """Add a comment to a ticket"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    
    if not data.get('content') or not data.get('user_id'):
        return jsonify({'error': 'Content and user_id are required'}), 400
    
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 400
    
    comment = Comment(
        ticket_id=ticket_id,
        user_id=data['user_id'],
        content=data['content'],
        is_internal=data.get('is_internal', False)
    )
    db.session.add(comment)
    db.session.commit()
    
    # Update ticket's updated_at
    ticket.updated_at = datetime.utcnow()
    db.session.commit()
    
    add_ticket_history(ticket_id, data['user_id'], 'comment_added')
    
    return jsonify(comment.to_dict()), 201


# ---- Ticket History Routes ----

@app.route('/api/tickets/<int:ticket_id>/history', methods=['GET'])
def get_ticket_history(ticket_id):
    """Get history/audit trail for a ticket"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    history = TicketHistory.query.filter_by(ticket_id=ticket_id)\
        .order_by(TicketHistory.created_at.desc()).all()
    
    return jsonify([h.to_dict() for h in history])


# ---- Dashboard/Statistics Routes ----

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    stats = {
        'total_tickets': Ticket.query.count(),
        'open_tickets': Ticket.query.filter_by(status='open').count(),
        'in_progress': Ticket.query.filter_by(status='in_progress').count(),
        'pending_customer': Ticket.query.filter_by(status='pending_customer').count(),
        'resolved': Ticket.query.filter_by(status='resolved').count(),
        'closed': Ticket.query.filter_by(status='closed').count(),
        'critical_tickets': Ticket.query.filter_by(priority='critical', status='open').count(),
        'high_priority': Ticket.query.filter_by(priority='high', status='open').count(),
        'overdue': Ticket.query.filter(
            Ticket.due_date < datetime.utcnow(),
            Ticket.status.in_(['open', 'in_progress'])
        ).count()
    }
    
    # Tickets by priority
    stats['by_priority'] = {
        'low': Ticket.query.filter_by(priority='low').count(),
        'medium': Ticket.query.filter_by(priority='medium').count(),
        'high': Ticket.query.filter_by(priority='high').count(),
        'critical': Ticket.query.filter_by(priority='critical').count()
    }
    
    # Tickets by category
    categories = Category.query.all()
    stats['by_category'] = []
    for cat in categories:
        stats['by_category'].append({
            'name': cat.name,
            'count': Ticket.query.filter_by(category_id=cat.id).count()
        })
    
    # Recent activity (tickets created in last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    stats['recent_activity'] = Ticket.query.filter(Ticket.created_at >= week_ago).count()
    
    return jsonify(stats)


@app.route('/api/tickets/overdue', methods=['GET'])
def get_overdue_tickets():
    """Get all overdue tickets"""
    tickets = Ticket.query.filter(
        Ticket.due_date < datetime.utcnow(),
        Ticket.status.in_(['open', 'in_progress', 'pending_customer'])
    ).order_by(Ticket.due_date.asc()).all()
    
    return jsonify([t.to_dict() for t in tickets])


@app.route('/api/tickets/unassigned', methods=['GET'])
def get_unassigned_tickets():
    """Get all unassigned tickets"""
    tickets = Ticket.query.filter_by(assigned_to=None)\
        .filter(Ticket.status.in_(['open', 'in_progress']))\
        .order_by(Ticket.priority.desc(), Ticket.created_at.asc()).all()
    
    return jsonify([t.to_dict() for t in tickets])


# ---- Auto-Assignment Route ----

@app.route('/api/tickets/<int:ticket_id>/assign', methods=['POST'])
def assign_ticket(ticket_id):
    """Assign a ticket to an agent"""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    agent_id = data.get('agent_id')
    
    if not agent_id:
        return jsonify({'error': 'Agent ID is required'}), 400
    
    agent = User.query.get(agent_id)
    if not agent or agent.role not in ['agent', 'admin']:
        return jsonify({'error': 'Valid agent not found'}), 400
    
    old_agent = ticket.assigned_to
    ticket.assigned_to = agent_id
    
    # Auto-change status to in_progress if open
    if ticket.status == 'open':
        ticket.status = 'in_progress'
    
    db.session.commit()
    
    add_ticket_history(
        ticket_id, 
        agent_id, 
        'assigned', 
        'assigned_to', 
        old_agent, 
        agent_id
    )
    
    return jsonify(ticket.to_dict())


# ==================== INITIALIZE DATABASE ====================

def init_db():
    """Initialize database with sample data"""
    with app.app_context():
        db.create_all()
        
        # Check if data already exists
        if User.query.first():
            return
        
        # Create sample users
        users = [
            User(name='Admin User', email='admin@ticketing.com', role='admin', department='IT'),
            User(name='John Agent', email='john@ticketing.com', role='agent', department='Support'),
            User(name='Jane Agent', email='jane@ticketing.com', role='agent', department='Support'),
            User(name='Mike Agent', email='mike@ticketing.com', role='agent', department='Technical'),
            User(name='Sarah Customer', email='sarah@customer.com', role='customer', department=None),
            User(name='Tom Customer', email='tom@customer.com', role='customer', department=None),
        ]
        db.session.add_all(users)
        db.session.commit()
        
        # Create sample categories
        categories = [
            Category(name='Technical Issue', description='Technical problems and bugs', color='#dc3545', sla_hours=4),
            Category(name='Billing', description='Billing and payment issues', color='#fd7e14', sla_hours=24),
            Category(name='Feature Request', description='New feature requests', color='#28a745', sla_hours=48),
            Category(name='General Inquiry', description='General questions', color='#17a2b8', sla_hours=12),
            Category(name='Account Issue', description='Account and access problems', color='#6f42c1', sla_hours=8),
        ]
        db.session.add_all(categories)
        db.session.commit()
        
        # Create sample tickets
        sample_tickets = [
            {
                'title': 'Cannot login to account',
                'description': 'I have been trying to login for the past hour but keep getting an error message saying "Invalid credentials" even though I am using the correct password.',
                'priority': 'high',
                'category_id': 5,
                'created_by': 5,
                'assigned_to': 2,
                'status': 'in_progress'
            },
            {
                'title': 'Payment not processing',
                'description': 'When I try to pay for my subscription, the payment page just keeps loading and never completes.',
                'priority': 'critical',
                'category_id': 2,
                'created_by': 6,
                'assigned_to': 3,
                'status': 'open'
            },
            {
                'title': 'Add dark mode support',
                'description': 'It would be great if the application could support dark mode for better user experience during night time usage.',
                'priority': 'low',
                'category_id': 3,
                'created_by': 5,
                'assigned_to': None,
                'status': 'open'
            },
            {
                'title': 'API response is slow',
                'description': 'The API endpoints are taking more than 5 seconds to respond. This is affecting our application performance.',
                'priority': 'high',
                'category_id': 1,
                'created_by': 6,
                'assigned_to': 4,
                'status': 'pending_customer'
            },
            {
                'title': 'How to export data?',
                'description': 'I need to export all my data to Excel format. Is there a way to do this?',
                'priority': 'medium',
                'category_id': 4,
                'created_by': 5,
                'assigned_to': 2,
                'status': 'resolved'
            },
            {
                'title': 'Bug in report generation',
                'description': 'When generating monthly reports, the totals are not matching with the actual data.',
                'priority': 'critical',
                'category_id': 1,
                'created_by': 6,
                'assigned_to': 4,
                'status': 'open'
            },
            {
                'title': 'Invoice not received',
                'description': 'I paid my bill last week but have not received the invoice yet.',
                'priority': 'medium',
                'category_id': 2,
                'created_by': 5,
                'assigned_to': 3,
                'status': 'in_progress'
            },
            {
                'title': 'Mobile app crashes on startup',
                'description': 'The mobile app crashes immediately after opening on my Android phone.',
                'priority': 'high',
                'category_id': 1,
                'created_by': 6,
                'assigned_to': None,
                'status': 'open'
            },
        ]
        
        for ticket_data in sample_tickets:
            priority = ticket_data['priority']
            ticket = Ticket(
                ticket_number='',
                title=ticket_data['title'],
                description=ticket_data['description'],
                priority=priority,
                status=ticket_data['status'],
                category_id=ticket_data['category_id'],
                created_by=ticket_data['created_by'],
                assigned_to=ticket_data['assigned_to']
            )
            ticket.ticket_number = ticket.generate_ticket_number()
            ticket.due_date = calculate_due_date(ticket_data['category_id'], priority)
            
            if ticket_data['status'] == 'resolved':
                ticket.resolved_at = datetime.utcnow() - timedelta(days=1)
            
            db.session.add(ticket)
        
        db.session.commit()
        
        # Add sample comments
        comments = [
            Comment(ticket_id=1, user_id=2, content='I am looking into this issue. Can you please confirm your email address?', is_internal=False),
            Comment(ticket_id=1, user_id=5, content='Yes, my email is sarah@customer.com', is_internal=False),
            Comment(ticket_id=2, user_id=3, content='Escalating to payments team for investigation.', is_internal=True),
            Comment(ticket_id=4, user_id=4, content='We have identified the bottleneck and are working on a fix. ETA: 2 hours.', is_internal=False),
        ]
        db.session.add_all(comments)
        db.session.commit()
        
        print("Database initialized with sample data!")


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
# 🎫 TicketFlow - Automated Ticketing System Simulator

A full-stack ticketing system simulator built with Flask (Python) and vanilla JavaScript. This project demonstrates understanding of support workflows, database design, and CRUD operations.

## Features

### Core Functionality
- **Ticket Management**: Full CRUD operations for support tickets
- **Priority Levels**: Critical, High, Medium, Low with visual indicators
- **Status Tracking**: Open, In Progress, Pending Customer, Resolved, Closed
- **Ticket Assignment**: Assign tickets to support agents
- **Categories**: Organize tickets by type (Technical, Billing, Feature Request, etc.)
- **SLA Management**: Automatic due date calculation based on category and priority

### User Features
- **Dashboard**: Overview with statistics and recent tickets
- **Ticket List**: Filterable, sortable, and searchable ticket database
- **Ticket Detail View**: Full ticket information with comments and history
- **Comments System**: Public replies and internal notes
- **Audit Trail**: Complete history of all ticket changes

### Advanced Features
- **Overdue Tracking**: Automatic identification of overdue tickets
- **Unassigned Queue**: View and manage unassigned tickets
- **Pagination**: Efficient handling of large ticket volumes
- **Real-time Search**: Search across ticket numbers, titles, and descriptions

## Tech Stack

### Backend
- **Flask** - Python web framework
- **Flask-SQLAlchemy** - ORM for database operations
- **Flask-CORS** - Cross-origin resource sharing
- **SQLite** - Lightweight database

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS variables
- **HTML5** - Semantic markup

## Project Structure

```
ticketing-system/
├── backend/
│   ├── app.py              # Flask application with API routes
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styling
│   └── app.js              # JavaScript application
└── README.md               # This file
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser

### Step 1: Install Backend Dependencies

```bash
cd ticketing-system/backend
pip install -r requirements.txt
```

### Step 2: Start the Backend Server

```bash
python app.py
```

The server will start on `http://localhost:5000` and automatically:
- Create the SQLite database
- Initialize sample data (users, categories, tickets)

### Step 3: Open the Frontend

You can open the frontend in one of these ways:

**Option A: Direct File Open**
Simply open `ticketing-system/frontend/index.html` in your web browser.

**Option B: Using a Local Server** (Recommended)
```bash
cd ticketing-system/frontend
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

## API Endpoints

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List all tickets (with filtering, sorting, pagination) |
| GET | `/api/tickets/<id>` | Get a single ticket |
| POST | `/api/tickets` | Create a new ticket |
| PUT | `/api/tickets/<id>` | Update a ticket |
| DELETE | `/api/tickets/<id>` | Delete (soft close) a ticket |
| GET | `/api/tickets/overdue` | Get all overdue tickets |
| GET | `/api/tickets/unassigned` | Get all unassigned tickets |
| POST | `/api/tickets/<id>/assign` | Assign a ticket to an agent |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets/<id>/comments` | Get ticket comments |
| POST | `/api/tickets/<id>/comments` | Add a comment to a ticket |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create a new category |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a new user |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |

## Sample Data

The application comes pre-loaded with sample data:

### Users
- **Admin User** (admin@ticketing.com) - Administrator
- **John Agent** (john@ticketing.com) - Support Agent
- **Jane Agent** (jane@ticketing.com) - Support Agent
- **Mike Agent** (mike@ticketing.com) - Technical Agent
- **Sarah Customer** (sarah@customer.com) - Customer
- **Tom Customer** (tom@customer.com) - Customer

### Categories
- Technical Issue (4h SLA)
- Billing (24h SLA)
- Feature Request (48h SLA)
- General Inquiry (12h SLA)
- Account Issue (8h SLA)

### Sample Tickets
8 pre-created tickets demonstrating various states, priorities, and categories.

## Database Schema

```
┌─────────────────┐    ┌─────────────────┐
│      users      │    │   categories    │
├─────────────────┤    ├─────────────────┤
│ id              │    │ id              │
│ name            │    │ name            │
│ email           │    │ description     │
│ role            │    │ color           │
│ department      │    │ sla_hours       │
│ is_active       │    └─────────────────┘
│ created_at      │           ▲
└─────────────────┘           │
      ▲ ▲                     │
      │ │         ┌───────────┴───────────┐
      │ │         │                       │
      │ │    ┌────┴─────┐          ┌──────┴──────┐
      │ │    │  tickets │          │   comments  │
      │ │    ├──────────┤          ├─────────────┤
      │ │    │ id       │          │ id          │
      │ │    │ ticket_# │          │ ticket_id   │
      │ │    │ title    │          │ user_id     │
      │ │    │ desc     │          │ content     │
      │ │    │ priority │          │ is_internal │
      │ │    │ status   │          │ created_at  │
      │ │    │ category │◄─────────┘             │
      │ │    │ created_by│                       │
      │ │    │ assigned_to│                      │
      │ │    │ timestamps│                       │
      │ │    └──────────┘                        │
      │ │                                        │
      │ └────────────────────────────────────────┘
      │
      └────────── (ticket_history for audit trail)
```

## Support Workflow

1. **Ticket Creation**: Customer submits a ticket with title, description, category, and priority
2. **Auto-Assignment**: Tickets can be automatically assigned to available agents
3. **Investigation**: Agent changes status to "In Progress" and adds internal notes
4. **Customer Communication**: Agent adds public comments to request more information
5. **Resolution**: Agent resolves the ticket and marks it as "Resolved"
6. **Closure**: Ticket is closed after customer confirmation or timeout

## License

MIT License - Feel free to use this project for learning and portfolio purposes.
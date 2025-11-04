# Project Structure

## Backend (`/backend`)

```
backend/
├── app.py                 # Flask application entry point
├── config.py              # Configuration (database, JWT)
├── models.py              # SQLAlchemy database models
├── seed.py                # Database seeding (default admin)
├── utils.py               # Utility functions (decorators)
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
└── routes/
    ├── auth.py            # Authentication endpoints
    ├── instructors.py    # Instructor CRUD endpoints (admin only)
    ├── students.py        # Student CRUD endpoints (admin/instructor)
    └── student_groups.py  # Student group CRUD endpoints (admin/instructor)
```

### Key Models

- **User**: Base user model with email, password, role
- **Instructor**: Instructor profile linked to User
- **Student**: Student profile linked to User
- **StudentGroup**: Groups that can contain multiple students and instructors

### Relationships

- User → Instructor (one-to-one)
- User → Student (one-to-one)
- Student ↔ StudentGroup (many-to-many)
- Instructor ↔ StudentGroup (many-to-many)

## Frontend (`/frontend`)

```
frontend/
├── index.html             # HTML entry point
├── package.json           # Node dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # Main app component with routing
    ├── index.css          # Global styles (Tailwind)
    ├── components/
    │   ├── Layout.jsx     # Main layout with navigation
    │   └── ui/            # shadcn/ui components
    │       ├── button.jsx
    │       ├── input.jsx
    │       ├── card.jsx
    │       ├── dialog.jsx
    │       ├── table.jsx
    │       ├── select.jsx
    │       ├── label.jsx
    │       ├── toast.jsx
    │       └── use-toast.js
    ├── context/
    │   └── AuthContext.jsx # Authentication context
    ├── lib/
    │   ├── api.js         # Axios instance with interceptors
    │   └── utils.js       # Utility functions (cn helper)
    └── pages/
        ├── Login.jsx              # Login page
        ├── Dashboard.jsx          # Admin/Instructor dashboard
        ├── Instructors.jsx         # Instructor management (admin)
        ├── Students.jsx           # Student management
        ├── StudentGroups.jsx      # Student group management
        └── StudentDashboard.jsx   # Student view (groups & profile)
```

## Features by Role

### Admin
- ✅ Full CRUD on Instructors
- ✅ Full CRUD on Students
- ✅ Full CRUD on Student Groups
- ✅ View Dashboard

### Instructor
- ✅ Full CRUD on Students
- ✅ Full CRUD on Student Groups
- ✅ View Dashboard

### Student
- ✅ View personal profile
- ✅ View assigned groups
- ✅ View group instructors

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with Werkzeug
- Protected API routes
- CORS configuration

## Database Schema

```
User
├── id (PK)
├── email (unique)
├── password_hash
├── role (admin/instructor/student)
└── timestamps

Instructor
├── id (PK)
├── user_id (FK → User)
├── first_name
├── last_name
├── phone
└── timestamps

Student
├── id (PK)
├── user_id (FK → User)
├── first_name
├── last_name
├── phone
├── date_of_birth
└── timestamps

StudentGroup
├── id (PK)
├── name
├── description
└── timestamps

student_group_association (junction table)
├── student_id (FK → Student)
└── group_id (FK → StudentGroup)

instructor_group_association (junction table)
├── instructor_id (FK → Instructor)
└── group_id (FK → StudentGroup)
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (optional)
- `GET /api/auth/me` - Get current user

### Instructors (Admin only)
- `GET /api/instructors` - List all
- `POST /api/instructors` - Create
- `GET /api/instructors/:id` - Get one
- `PUT /api/instructors/:id` - Update
- `DELETE /api/instructors/:id` - Delete

### Students (Admin/Instructor)
- `GET /api/students` - List all
- `POST /api/students` - Create
- `GET /api/students/:id` - Get one
- `PUT /api/students/:id` - Update
- `DELETE /api/students/:id` - Delete

### Student Groups (Admin/Instructor)
- `GET /api/student-groups` - List all
- `POST /api/student-groups` - Create
- `GET /api/student-groups/:id` - Get one
- `PUT /api/student-groups/:id` - Update
- `DELETE /api/student-groups/:id` - Delete

## Technology Decisions

### Why Flask?
- Lightweight and flexible
- Easy to set up and understand
- Good for REST APIs
- Extensive ecosystem

### Why React + Vite?
- Modern React with hooks
- Fast development with Vite
- Component-based architecture
- Great ecosystem

### Why Tailwind + shadcn?
- Utility-first CSS for rapid development
- shadcn/ui provides accessible, customizable components
- Modern, clean design out of the box
- Easy to customize

### Why MySQL?
- Reliable and widely used
- Good for relational data
- Easy to set up locally
- Strong community support

## Development Workflow

1. **Backend**: Start Flask server (`python app.py`)
2. **Frontend**: Start Vite dev server (`npm run dev`)
3. **Database**: MySQL server must be running
4. **Environment**: Configure `.env` file in backend

## Production Considerations

- Use production WSGI server (Gunicorn/uWSGI)
- Configure proper CORS origins
- Use environment variables for secrets
- Enable HTTPS
- Add rate limiting
- Implement proper logging
- Database connection pooling
- Frontend build optimization


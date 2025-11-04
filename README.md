# Training Portal

A modern, full-stack training portal application with user management capabilities. Built with Python Flask backend, MySQL database, and React frontend with Tailwind CSS and shadcn/ui components.

## Features

- **User Roles**: Admin, Instructors, and Students
- **Instructor Management**: Admin can perform complete CRUD operations on instructors
- **Student Management**: Admin and Instructors can manage students
- **Student Groups**: Admin and Instructors can create and manage student groups
- **Multi-group Support**: Students can belong to multiple groups
- **Multi-instructor Groups**: Groups can have multiple instructors
- **Authentication**: JWT-based authentication system
- **Modern UI**: Clean, responsive design with shadcn/ui components

## Tech Stack

### Backend
- Python 3.x
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- PyMySQL
- MySQL

### Frontend
- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- MySQL 5.7 or higher
- npm or yarn

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a MySQL database:
```sql
CREATE DATABASE training_portal;
```

5. Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=training_portal
JWT_SECRET_KEY=your-secret-key-change-this-in-production
FLASK_ENV=development
```

6. Run the Flask application:
```bash
python app.py
```

The backend will run on `http://localhost:5000` and automatically create tables and seed the default admin user.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` (or the next available port).

## Default Admin Credentials

- **Email**: admin@trainingportal.com
- **Password**: admin123

⚠️ **Important**: Change the default admin password in production!

## Project Structure

```
.
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── config.py           # Configuration settings
│   ├── models.py           # Database models
│   ├── seed.py             # Database seeding
│   ├── utils.py            # Utility functions (decorators)
│   ├── routes/             # API route blueprints
│   │   ├── auth.py         # Authentication routes
│   │   ├── instructors.py  # Instructor CRUD routes
│   │   ├── students.py     # Student CRUD routes
│   │   └── student_groups.py # Student group CRUD routes
│   └── requirements.txt     # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   │   ├── ui/         # shadcn/ui components
    │   │   └── Layout.jsx  # Main layout component
    │   ├── context/        # React contexts
    │   │   └── AuthContext.jsx
    │   ├── lib/            # Utility libraries
    │   │   ├── api.js      # Axios instance
    │   │   └── utils.js    # Helper functions
    │   ├── pages/          # Page components
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Instructors.jsx
    │   │   ├── Students.jsx
    │   │   ├── StudentGroups.jsx
    │   │   └── StudentDashboard.jsx
    │   ├── App.jsx         # Main app component
    │   └── main.jsx        # Entry point
    ├── package.json
    └── vite.config.js
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### Instructors (Admin only)
- `GET /api/instructors` - Get all instructors
- `POST /api/instructors` - Create instructor
- `GET /api/instructors/:id` - Get instructor by ID
- `PUT /api/instructors/:id` - Update instructor
- `DELETE /api/instructors/:id` - Delete instructor

### Students (Admin and Instructor)
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Student Groups (Admin and Instructor)
- `GET /api/student-groups` - Get all groups
- `POST /api/student-groups` - Create group
- `GET /api/student-groups/:id` - Get group by ID
- `PUT /api/student-groups/:id` - Update group
- `DELETE /api/student-groups/:id` - Delete group

## Features by Role

### Admin
- Full access to all modules
- Manage instructors (CRUD)
- Manage students (CRUD)
- Manage student groups (CRUD)

### Instructor
- Manage students (CRUD)
- Manage student groups (CRUD)
- View dashboard

### Student
- View personal profile
- View assigned groups
- View group instructors

## Development

### Backend Development
- The backend uses Flask's development server (not suitable for production)
- Database migrations are handled automatically via SQLAlchemy
- JWT tokens are used for authentication

### Frontend Development
- Uses Vite for fast development and building
- Hot module replacement (HMR) enabled
- Components follow React best practices

## Production Considerations

1. **Security**:
   - Change default admin password
   - Use strong JWT secret key
   - Enable HTTPS
   - Implement rate limiting
   - Add input validation and sanitization

2. **Database**:
   - Use connection pooling
   - Add database indexes for performance
   - Regular backups

3. **Backend**:
   - Use production WSGI server (Gunicorn, uWSGI)
   - Set up proper logging
   - Configure CORS properly

4. **Frontend**:
   - Build for production: `npm run build`
   - Serve static files with a proper web server
   - Configure environment variables

## License

This project is open source and available for educational purposes.


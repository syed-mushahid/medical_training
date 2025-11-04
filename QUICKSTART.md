# Quick Start Guide

## Prerequisites Check
- Python 3.8+ installed
- Node.js 16+ installed
- MySQL server running

## Step 1: Database Setup

1. Login to MySQL:
```bash
mysql -u root -p
```

2. Create database:
```sql
CREATE DATABASE training_portal;
EXIT;
```

## Step 2: Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Create virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=training_portal
JWT_SECRET_KEY=change-this-to-a-random-secret-key
FLASK_ENV=development
```

5. Run the backend:
```bash
python app.py
```

The backend will start on `http://localhost:5000` and automatically create tables and seed the admin user.

## Step 3: Frontend Setup

1. Open a new terminal and navigate to frontend:
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

The frontend will start on `http://localhost:3000` (or next available port).

## Step 4: Login

1. Open your browser and go to `http://localhost:3000`
2. Login with default admin credentials:
   - Email: `admin@trainingportal.com`
   - Password: `admin123`

## Next Steps

- Create instructors (Admin only)
- Create student groups (Admin/Instructor)
- Add students to groups
- Assign instructors to groups
- Students can login and view their groups

## Troubleshooting

### Backend Issues
- Make sure MySQL is running
- Check that database credentials in `.env` are correct
- Ensure port 5000 is not in use

### Frontend Issues
- Make sure backend is running first
- Check that port 3000 is available
- Clear browser cache if having issues

### Database Issues
- Make sure MySQL server is running
- Verify database exists: `SHOW DATABASES;`
- Check user permissions


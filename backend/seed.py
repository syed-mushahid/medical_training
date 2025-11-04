from models import db, User
from werkzeug.security import generate_password_hash

def seed_admin():
    """Seed default admin user if it doesn't exist"""
    admin = User.query.filter_by(email='admin@trainingportal.com').first()
    if not admin:
        admin = User(
            email='admin@trainingportal.com',
            password_hash=generate_password_hash('admin123'),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print("Default admin created: admin@trainingportal.com / admin123")


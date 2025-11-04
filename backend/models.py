from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

# Association table for many-to-many relationship between students and groups
student_group_association = db.Table('student_group_association',
    db.Column('student_id', db.Integer, db.ForeignKey('student.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('student_group.id'), primary_key=True)
)

# Association table for many-to-many relationship between instructors and groups
instructor_group_association = db.Table('instructor_group_association',
    db.Column('instructor_id', db.Integer, db.ForeignKey('instructor.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('student_group.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'instructor', 'student'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    instructor = db.relationship('Instructor', backref='user', uselist=False, cascade='all, delete-orphan')
    student = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Instructor(db.Model):
    __tablename__ = 'instructor'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    ragflow_api_key = db.Column(db.Text, nullable=True)  # RAGFlow API key for this instructor
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Many-to-many relationship with groups
    groups = db.relationship('StudentGroup', secondary=instructor_group_association, backref='instructors', lazy='select')
    
    def to_dict(self, include_user=False):
        data = {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'ragflow_api_key': self.ragflow_api_key,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_user:
            data['user'] = self.user.to_dict() if self.user else None
        return data

class Student(db.Model):
    __tablename__ = 'student'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    student_id = db.Column(db.String(50), unique=True, nullable=True)  # Student ID number
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Many-to-many relationship with groups
    groups = db.relationship('StudentGroup', secondary=student_group_association, backref='students', lazy='select')
    
    def to_dict(self, include_user=False, include_groups=False):
        data = {
            'id': self.id,
            'student_id': self.student_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_user:
            data['user'] = self.user.to_dict() if self.user else None
        if include_groups:
            data['groups'] = [group.to_dict(include_instructors=True) for group in self.groups]
        return data

class StudentGroup(db.Model):
    __tablename__ = 'student_group'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_by_instructor_id = db.Column(db.Integer, db.ForeignKey('instructor.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to creator instructor
    created_by_instructor = db.relationship('Instructor', foreign_keys=[created_by_instructor_id], backref='created_groups')
    
    def to_dict(self, include_students=False, include_instructors=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_by_instructor_id': self.created_by_instructor_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_students:
            data['students'] = [student.to_dict() for student in self.students]
        if include_instructors:
            data['instructors'] = [instructor.to_dict() for instructor in self.instructors]
        return data


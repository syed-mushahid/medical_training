from flask import Blueprint, request, jsonify
from models import db, User, Student, StudentGroup
from utils import admin_or_instructor_required
from datetime import datetime

students_bp = Blueprint('students', __name__)

@students_bp.route('', methods=['GET'])
@admin_or_instructor_required
def get_students():
    try:
        print(f"\n[get_students] Fetching students...")
        students = Student.query.all()
        print(f"[get_students] Found {len(students)} students")
        return jsonify({
            'students': [student.to_dict(include_user=True, include_groups=True) for student in students]
        }), 200
    except Exception as e:
        print(f"\n[get_students] ERROR: {str(e)}")
        import traceback
        print(f"[get_students] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fetch students: {str(e)}'}), 500

@students_bp.route('', methods=['POST'])
@admin_or_instructor_required
def create_student():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    if not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'First name and last name are required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Check if student_id is unique (if provided)
    if data.get('student_id'):
        if Student.query.filter_by(student_id=data['student_id']).first():
            return jsonify({'error': 'Student ID already exists'}), 400
    
    # Create user
    user = User(
        email=data['email'],
        role='student'
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()
    
    # Parse date of birth if provided
    date_of_birth = None
    if data.get('date_of_birth'):
        try:
            date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Create student
    student = Student(
        user_id=user.id,
        student_id=data.get('student_id'),
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone'),
        date_of_birth=date_of_birth
    )
    db.session.add(student)
    db.session.flush()
    
    # Assign to groups if provided
    if data.get('group_ids'):
        groups = StudentGroup.query.filter(StudentGroup.id.in_(data['group_ids'])).all()
        student.groups = groups
    
    db.session.commit()
    
    return jsonify({
        'student': student.to_dict(include_user=True, include_groups=True)
    }), 201

@students_bp.route('/<int:student_id>', methods=['GET'])
@admin_or_instructor_required
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify({
        'student': student.to_dict(include_user=True, include_groups=True)
    }), 200

@students_bp.route('/<int:student_id>', methods=['PUT'])
@admin_or_instructor_required
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json()
    
    if data.get('first_name'):
        student.first_name = data['first_name']
    if data.get('last_name'):
        student.last_name = data['last_name']
    if data.get('phone') is not None:
        student.phone = data['phone']
    
    # Update student_id if provided and different
    if 'student_id' in data:
        new_student_id = data['student_id']
        # Check if the new student_id is already taken by another student
        if new_student_id and new_student_id != student.student_id:
            existing_student = Student.query.filter_by(student_id=new_student_id).first()
            if existing_student and existing_student.id != student.id:
                return jsonify({'error': 'Student ID already exists'}), 400
        student.student_id = new_student_id if new_student_id else None
    
    if data.get('date_of_birth'):
        try:
            student.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if data.get('email') and student.user:
        if User.query.filter(User.email == data['email'], User.id != student.user_id).first():
            return jsonify({'error': 'Email already in use'}), 400
        student.user.email = data['email']
    
    if data.get('password') and student.user:
        student.user.set_password(data['password'])
    
    # Update groups if provided
    if 'group_ids' in data:
        groups = StudentGroup.query.filter(StudentGroup.id.in_(data['group_ids'])).all()
        student.groups = groups
    
    db.session.commit()
    
    return jsonify({
        'student': student.to_dict(include_user=True, include_groups=True)
    }), 200

@students_bp.route('/<int:student_id>', methods=['DELETE'])
@admin_or_instructor_required
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    user_id = student.user_id
    
    db.session.delete(student)
    if student.user:
        db.session.delete(student.user)
    db.session.commit()
    
    return jsonify({'message': 'Student deleted successfully'}), 200


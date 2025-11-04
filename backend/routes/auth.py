from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from models import db, User, Instructor, Student

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({'error': 'Invalid JSON in request body'}), 400
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    role = data.get('role', 'student')
    if role not in ['admin', 'instructor', 'student']:
        return jsonify({'error': 'Invalid role'}), 400
    
    # Create user
    user = User(
        email=data['email'],
        role=role
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()
    
    # Create role-specific profile
    if role == 'instructor':
        instructor = Instructor(
            user_id=user.id,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            phone=data.get('phone')
        )
        db.session.add(instructor)
    elif role == 'student':
        student = Student(
            user_id=user.id,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            phone=data.get('phone'),
            date_of_birth=data.get('date_of_birth')
        )
        db.session.add(student)
    
    db.session.commit()
    
    # JWT identity must be a string
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({'error': 'Invalid JSON in request body'}), 400
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # JWT identity must be a string
    access_token = create_access_token(identity=str(user.id))
    
    user_data = user.to_dict()
    if user.role == 'instructor' and user.instructor:
        user_data['profile'] = user.instructor.to_dict()
    elif user.role == 'student' and user.student:
        user_data['profile'] = user.student.to_dict(include_groups=True)
    
    return jsonify({
        'access_token': access_token,
        'user': user_data
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    try:
        print(f"\n[/auth/me] Getting current user info...")
        current_user_id = get_jwt_identity()
        # Convert string back to int for database query
        current_user_id = int(current_user_id)
        print(f"[/auth/me] User ID from token: {current_user_id}")
        
        user = User.query.get(current_user_id)
        print(f"[/auth/me] User found: {user is not None}")
        
        if not user:
            print(f"[/auth/me] ERROR: User not found for ID {current_user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"[/auth/me] User email: {user.email}, Role: {user.role}")
        
        user_data = user.to_dict()
        
        if user.role == 'instructor' and user.instructor:
            user_data['profile'] = user.instructor.to_dict()
        elif user.role == 'student' and user.student:
            user_data['profile'] = user.student.to_dict(include_groups=True)
        
        print(f"[/auth/me] Successfully returned user data")
        return jsonify({'user': user_data}), 200
    except Exception as e:
        print(f"\n[/auth/me] ERROR: {str(e)}")
        import traceback
        print(f"[/auth/me] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to get user info: {str(e)}'}), 500


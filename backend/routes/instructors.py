from flask import Blueprint, request, jsonify
from models import db, User, Instructor
from utils import admin_required

instructors_bp = Blueprint('instructors', __name__)

@instructors_bp.route('', methods=['GET'])
@admin_required
def get_instructors():
    try:
        print(f"\n[get_instructors] Fetching instructors...")
        instructors = Instructor.query.all()
        print(f"[get_instructors] Found {len(instructors)} instructors")
        return jsonify({
            'instructors': [instructor.to_dict(include_user=True) for instructor in instructors]
        }), 200
    except Exception as e:
        print(f"\n[get_instructors] ERROR: {str(e)}")
        import traceback
        print(f"[get_instructors] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fetch instructors: {str(e)}'}), 500

@instructors_bp.route('', methods=['POST'])
@admin_required
def create_instructor():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    if not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'First name and last name are required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create user
    user = User(
        email=data['email'],
        role='instructor'
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()
    
    # Create instructor
    instructor = Instructor(
        user_id=user.id,
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone'),
        ragflow_api_key=data.get('ragflow_api_key')
    )
    db.session.add(instructor)
    db.session.commit()
    
    return jsonify({
        'instructor': instructor.to_dict(include_user=True)
    }), 201

@instructors_bp.route('/<int:instructor_id>', methods=['GET'])
@admin_required
def get_instructor(instructor_id):
    instructor = Instructor.query.get_or_404(instructor_id)
    return jsonify({
        'instructor': instructor.to_dict(include_user=True)
    }), 200

@instructors_bp.route('/<int:instructor_id>', methods=['PUT'])
@admin_required
def update_instructor(instructor_id):
    instructor = Instructor.query.get_or_404(instructor_id)
    data = request.get_json()
    
    if data.get('first_name'):
        instructor.first_name = data['first_name']
    if data.get('last_name'):
        instructor.last_name = data['last_name']
    if data.get('phone') is not None:
        instructor.phone = data['phone']
    if 'ragflow_api_key' in data:
        instructor.ragflow_api_key = data['ragflow_api_key'] if data['ragflow_api_key'] else None
    
    if data.get('email') and instructor.user:
        if User.query.filter(User.email == data['email'], User.id != instructor.user_id).first():
            return jsonify({'error': 'Email already in use'}), 400
        instructor.user.email = data['email']
    
    if data.get('password') and instructor.user:
        instructor.user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'instructor': instructor.to_dict(include_user=True)
    }), 200

@instructors_bp.route('/<int:instructor_id>', methods=['DELETE'])
@admin_required
def delete_instructor(instructor_id):
    instructor = Instructor.query.get_or_404(instructor_id)
    user_id = instructor.user_id
    
    db.session.delete(instructor)
    if instructor.user:
        db.session.delete(instructor.user)
    db.session.commit()
    
    return jsonify({'message': 'Instructor deleted successfully'}), 200


from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import admin_or_instructor_required, get_current_user
from models import db, User, Instructor

instructor_profile_bp = Blueprint('instructor_profile', __name__)

@instructor_profile_bp.route('/instructor/profile', methods=['PUT'])
@jwt_required()
@admin_or_instructor_required
def update_instructor_profile():
    """Allow instructors to update their own profile information"""
    try:
        current_user = get_current_user()
        
        # Only instructors can update their own profile
        if current_user.role != 'instructor':
            return jsonify({'error': 'This endpoint is only for instructors'}), 403
        
        if not current_user.instructor:
            return jsonify({'error': 'Instructor profile not found'}), 404
        
        instructor = current_user.instructor
        data = request.get_json()
        
        # Update first name
        if data.get('first_name'):
            instructor.first_name = data['first_name']
        
        # Update last name
        if data.get('last_name'):
            instructor.last_name = data['last_name']
        
        # Update phone
        if 'phone' in data:
            instructor.phone = data['phone'] if data['phone'] else None
        
        # Update ragflow_api_key (optional)
        # Only update if a new value is provided (not empty string)
        if 'ragflow_api_key' in data:
            api_key_value = data['ragflow_api_key']
            if api_key_value and api_key_value.strip():
                instructor.ragflow_api_key = api_key_value.strip()
            # If empty string is provided, keep the current value (don't update)
            # This allows users to update other fields without changing the API key
        
        # Update email
        if data.get('email') and instructor.user:
            # Check if email is already in use by another user
            existing_user = User.query.filter(User.email == data['email'], User.id != instructor.user_id).first()
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 400
            instructor.user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'instructor': instructor.to_dict(include_user=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@instructor_profile_bp.route('/instructor/change-password', methods=['POST'])
@jwt_required()
@admin_or_instructor_required
def change_instructor_password():
    """Allow instructors to change their password"""
    try:
        current_user = get_current_user()
        
        # Only instructors can use this endpoint
        if current_user.role != 'instructor':
            return jsonify({'error': 'This endpoint is only for instructors'}), 403
        
        if not current_user.instructor:
            return jsonify({'error': 'Instructor profile not found'}), 404
        
        data = request.get_json()
        
        if not data.get('current_password'):
            return jsonify({'error': 'Current password is required'}), 400
        
        if not data.get('new_password'):
            return jsonify({'error': 'New password is required'}), 400
        
        # Verify current password
        if not current_user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Set new password
        current_user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to change password: {str(e)}'}), 500


from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import student_required, get_current_user
from models import db, User, Student
from datetime import datetime

student_profile_bp = Blueprint('student_profile', __name__)

@student_profile_bp.route('/student/profile', methods=['PUT'])
@jwt_required()
@student_required
def update_student_profile():
    """Allow students to update their own profile information"""
    try:
        current_user = get_current_user()
        
        if not current_user.student:
            return jsonify({'error': 'Student profile not found'}), 404
        
        student = current_user.student
        data = request.get_json()
        
        # Update first name
        if data.get('first_name'):
            student.first_name = data['first_name']
        
        # Update last name
        if data.get('last_name'):
            student.last_name = data['last_name']
        
        # Update phone
        if 'phone' in data:
            student.phone = data['phone'] if data['phone'] else None
        
        # Update date of birth
        if 'date_of_birth' in data:
            if data['date_of_birth']:
                try:
                    student.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
                except:
                    return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
            else:
                student.date_of_birth = None
        
        # Update email
        if data.get('email') and student.user:
            # Check if email is already in use by another user
            existing_user = User.query.filter(User.email == data['email'], User.id != student.user_id).first()
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 400
            student.user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'student': student.to_dict(include_user=True, include_groups=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@student_profile_bp.route('/student/change-password', methods=['POST'])
@jwt_required()
@student_required
def change_password():
    """Allow students to change their password"""
    try:
        current_user = get_current_user()
        
        if not current_user.student or not current_user.student.user:
            return jsonify({'error': 'Student profile not found'}), 404
        
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


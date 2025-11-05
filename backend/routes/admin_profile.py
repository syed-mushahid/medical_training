from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import admin_required, get_current_user
from models import db, User

admin_profile_bp = Blueprint('admin_profile', __name__)

@admin_profile_bp.route('/admin/profile', methods=['PUT'])
@jwt_required()
@admin_required
def update_admin_profile():
    """Allow admins to update their profile information (email only)"""
    try:
        current_user = get_current_user()
        
        if current_user.role != 'admin':
            return jsonify({'error': 'This endpoint is only for admins'}), 403
        
        data = request.get_json()
        
        # Update email
        if data.get('email'):
            # Check if email is already in use by another user
            existing_user = User.query.filter(User.email == data['email'], User.id != current_user.id).first()
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 400
            current_user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@admin_profile_bp.route('/admin/change-password', methods=['POST'])
@jwt_required()
@admin_required
def change_admin_password():
    """Allow admins to change their password"""
    try:
        current_user = get_current_user()
        
        if current_user.role != 'admin':
            return jsonify({'error': 'This endpoint is only for admins'}), 403
        
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


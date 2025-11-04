from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User, Instructor
import traceback

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            print(f"\n[admin_required] Request to: {request.path}")
            print(f"[admin_required] Method: {request.method}")
            print(f"[admin_required] Headers: {dict(request.headers)}")
            
            current_user_id = get_jwt_identity()
            # Convert string back to int for database query
            current_user_id = int(current_user_id)
            print(f"[admin_required] User ID from token: {current_user_id}")
            
            user = User.query.get(current_user_id)
            print(f"[admin_required] User found: {user is not None}")
            
            if user:
                print(f"[admin_required] User role: {user.role}")
            
            if not user or user.role != 'admin':
                print(f"[admin_required] Access denied - User: {user}, Role: {user.role if user else 'None'}")
                return jsonify({'error': 'Admin access required'}), 403
            
            print(f"[admin_required] Access granted")
            return f(*args, **kwargs)
        except Exception as e:
            print(f"\n[admin_required] ERROR: {str(e)}")
            print(f"[admin_required] Traceback: {traceback.format_exc()}")
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    return decorated_function

def admin_or_instructor_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            print(f"\n[admin_or_instructor_required] Request to: {request.path}")
            print(f"[admin_or_instructor_required] Method: {request.method}")
            print(f"[admin_or_instructor_required] Headers: {dict(request.headers)}")
            
            current_user_id = get_jwt_identity()
            # Convert string back to int for database query
            current_user_id = int(current_user_id)
            print(f"[admin_or_instructor_required] User ID from token: {current_user_id}")
            
            user = User.query.get(current_user_id)
            print(f"[admin_or_instructor_required] User found: {user is not None}")
            
            if user:
                print(f"[admin_or_instructor_required] User role: {user.role}")
            
            if not user or user.role not in ['admin', 'instructor']:
                print(f"[admin_or_instructor_required] Access denied - User: {user}, Role: {user.role if user else 'None'}")
                return jsonify({'error': 'Admin or Instructor access required'}), 403
            
            print(f"[admin_or_instructor_required] Access granted")
            return f(*args, **kwargs)
        except Exception as e:
            print(f"\n[admin_or_instructor_required] ERROR: {str(e)}")
            print(f"[admin_or_instructor_required] Traceback: {traceback.format_exc()}")
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    return decorated_function

def get_current_user():
    """Get the current authenticated user"""
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        # Convert string back to int for database query
        current_user_id = int(current_user_id)
        return User.query.get(current_user_id)
    except:
        return None

def get_current_instructor():
    """Get the current authenticated instructor"""
    user = get_current_user()
    if user and user.role == 'instructor' and user.instructor:
        return user.instructor
    return None


from flask import Blueprint, request, jsonify
from utils import admin_or_instructor_required, get_current_user
from config import Config
import requests

ragflow_sessions_bp = Blueprint('ragflow_sessions', __name__)

RAGFLOW_BASE_URL = Config.RAGFLOW_BASE_URL
RAGFLOW_API_KEY = Config.RAGFLOW_API_KEY

def get_ragflow_headers(api_key=None):
    """Get headers for RAGFlow API requests"""
    key = api_key or RAGFLOW_API_KEY
    if not key:
        raise ValueError('RAGFlow API key is required')
    
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {key}'
    }

def get_api_key_for_user(current_user):
    """Get API key for current user"""
    if current_user.role == 'instructor' and current_user.instructor:
        api_key = current_user.instructor.ragflow_api_key
        if not api_key:
            raise ValueError('RAGFlow API key is not configured for this instructor')
        return api_key
    elif current_user.role == 'admin':
        return RAGFLOW_API_KEY
    else:
        raise ValueError('RAGFlow API key is not configured')

@ragflow_sessions_bp.route('/chats/<chat_id>/sessions', methods=['POST'])
@admin_or_instructor_required
def create_session(chat_id):
    """Create a session with a chat assistant"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'name' not in data or not data.get('name'):
            return jsonify({'error': 'name is required'}), 400
        
        # Prepare request body
        request_body = {
            'name': data['name'].strip()
        }
        
        # Add optional fields
        if 'user_id' in data:
            request_body['user_id'] = data['user_id']
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/sessions',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'session': response_data.get('data', {})
            }), 201
        else:
            error_message = response_data.get('message', 'Failed to create session')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_sessions_bp.route('/chats/<chat_id>/sessions/<session_id>', methods=['PUT'])
@admin_or_instructor_required
def update_session(chat_id, session_id):
    """Update a session of a chat assistant"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'name' in data and not data.get('name'):
            return jsonify({'error': 'name cannot be empty'}), 400
        
        # Prepare request body
        request_body = {}
        
        if 'name' in data:
            request_body['name'] = data['name'].strip()
        
        if 'user_id' in data:
            request_body['user_id'] = data['user_id']
        
        # Make request to RAGFlow
        response = requests.put(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/sessions/{session_id}',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Session updated successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to update session')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_sessions_bp.route('/chats/<chat_id>/sessions', methods=['GET'])
@admin_or_instructor_required
def list_sessions(chat_id):
    """List sessions of a chat assistant"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '30')
        orderby = request.args.get('orderby', 'create_time')
        desc = request.args.get('desc', 'true')
        name = request.args.get('name')
        session_id = request.args.get('id')
        user_id = request.args.get('user_id')
        
        # Build query string
        params = {
            'page': page,
            'page_size': page_size,
            'orderby': orderby,
            'desc': desc
        }
        if name:
            params['name'] = name
        if session_id:
            params['id'] = session_id
        if user_id:
            params['user_id'] = user_id
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/sessions',
            headers=get_ragflow_headers(api_key_to_use),
            params=params,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'sessions': response_data.get('data', [])
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch sessions')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_sessions_bp.route('/chats/<chat_id>/sessions', methods=['DELETE'])
@admin_or_instructor_required
def delete_sessions(chat_id):
    """Delete sessions of a chat assistant (supports bulk delete)"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # ids is optional - if not provided, all sessions will be deleted
        ids = data.get('ids')
        
        # If ids is provided, validate it's a list
        if ids is not None:
            if not isinstance(ids, list):
                return jsonify({'error': 'ids must be a list of strings'}), 400
            for session_id in ids:
                if not isinstance(session_id, str):
                    return jsonify({'error': 'All session IDs must be strings'}), 400
        
        request_body = {}
        if ids is not None:
            request_body['ids'] = ids
        
        # Make request to RAGFlow
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/sessions',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Session(s) deleted successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to delete sessions')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


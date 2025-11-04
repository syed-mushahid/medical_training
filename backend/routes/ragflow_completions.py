from flask import Blueprint, request, Response, jsonify, stream_with_context
from utils import admin_or_instructor_required, get_current_user
from config import Config
import requests
import json

ragflow_completions_bp = Blueprint('ragflow_completions', __name__)

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

@ragflow_completions_bp.route('/chats/<chat_id>/completions', methods=['POST'])
@admin_or_instructor_required
def converse_with_chat(chat_id):
    """Converse with a chat assistant"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'question' not in data or not data.get('question'):
            return jsonify({'error': 'question is required'}), 400
        
        # Prepare request body
        request_body = {
            'question': data['question'].strip()
        }
        
        # Add optional fields
        if 'stream' in data:
            request_body['stream'] = bool(data['stream'])
        else:
            request_body['stream'] = True  # Default to streaming
        
        if 'session_id' in data and data.get('session_id'):
            request_body['session_id'] = data['session_id']
        
        if 'user_id' in data and data.get('user_id'):
            request_body['user_id'] = data['user_id']
        
        stream_mode = request_body.get('stream', True)
        
        if stream_mode:
            # Handle streaming response
            def generate():
                try:
                    response = requests.post(
                        f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/completions',
                        json=request_body,
                        headers=get_ragflow_headers(api_key_to_use),
                        timeout=120,
                        stream=True
                    )
                    
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            # Handle SSE format: data: {...}
                            if line_str.startswith('data:'):
                                json_str = line_str[5:].strip()
                                if json_str:
                                    try:
                                        data_obj = json.loads(json_str)
                                        yield f"data: {json.dumps(data_obj)}\n\n"
                                    except json.JSONDecodeError:
                                        # If it's just "true" or other non-JSON
                                        yield f"data: {json_str}\n\n"
                                else:
                                    yield f"data: {json.dumps({'code': 0, 'data': True})}\n\n"
                            else:
                                # Direct JSON line
                                yield f"data: {line_str}\n\n"
                except Exception as e:
                    error_data = {'code': -1, 'error': str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                }
            )
        else:
            # Handle non-streaming response
            response = requests.post(
                f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/completions',
                json=request_body,
                headers=get_ragflow_headers(api_key_to_use),
                timeout=120
            )
            
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('code') == 0:
                return jsonify({
                    'success': True,
                    'data': response_data.get('data', {})
                }), 200
            else:
                error_message = response_data.get('message', 'Failed to get response from chat assistant')
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


from flask import Blueprint, request, Response, jsonify, stream_with_context
from flask_jwt_extended import jwt_required
from utils import admin_or_instructor_required, student_required, get_current_user
from models import db
from config import Config
from sqlalchemy import text
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

def get_api_key_for_user(current_user, chat_id=None):
    """Get API key for current user. For students, try to use the instructor's key who assigned the chat."""
    if current_user.role == 'instructor' and current_user.instructor:
        api_key = current_user.instructor.ragflow_api_key
        if not api_key:
            raise ValueError('RAGFlow API key is not configured for this instructor')
        return api_key
    elif current_user.role == 'admin':
        return RAGFLOW_API_KEY
    elif current_user.role == 'student':
        # For students, try to get the instructor's API key who assigned this chat
        if chat_id and current_user.student:
            try:
                # Check direct assignment
                result = db.session.execute(
                    text('''
                        SELECT instructor_id FROM chat_student_association
                        WHERE chat_id = :chat_id AND student_id = :student_id
                    '''),
                    {'chat_id': chat_id, 'student_id': current_user.student.id}
                ).fetchone()
                
                if not result:
                    # Check group assignment
                    result = db.session.execute(
                        text('''
                            SELECT cga.instructor_id
                            FROM chat_student_group_association cga
                            INNER JOIN student_group_association sga ON cga.student_group_id = sga.group_id
                            WHERE cga.chat_id = :chat_id AND sga.student_id = :student_id
                        '''),
                        {'chat_id': chat_id, 'student_id': current_user.student.id}
                    ).fetchone()
                
                if result and result[0]:
                    from models import Instructor
                    instructor = Instructor.query.get(result[0])
                    if instructor and instructor.ragflow_api_key:
                        print(f"[get_api_key_for_user] Using instructor {result[0]}'s API key for student")
                        return instructor.ragflow_api_key
            except Exception as e:
                print(f"[get_api_key_for_user] Error finding instructor API key: {e}")
        
        # Fallback to global API key
        return RAGFLOW_API_KEY
    else:
        raise ValueError('RAGFlow API key is not configured')

@ragflow_completions_bp.route('/chats/<chat_id>/completions', methods=['POST'])
@jwt_required()
def converse_with_chat(chat_id):
    """Converse with a chat assistant"""
    try:
        current_user = get_current_user()
        
        # Check access for students
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            
            # Check if student has access to this chat
            student_id = current_user.student.id
            # Check direct assignment
            result = db.session.execute(
                text('SELECT 1 FROM chat_student_association WHERE chat_id = :chat_id AND student_id = :student_id'),
                {'chat_id': chat_id, 'student_id': student_id}
            ).fetchone()
            if not result:
                # Check group assignment
                result = db.session.execute(
                    text('''
                        SELECT 1 FROM chat_student_group_association cga
                        INNER JOIN student_group_association sga ON cga.student_group_id = sga.group_id
                        WHERE cga.chat_id = :chat_id AND sga.student_id = :student_id
                    '''),
                    {'chat_id': chat_id, 'student_id': student_id}
                ).fetchone()
                if not result:
                    return jsonify({'error': 'You do not have access to this chat assistant'}), 403
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'question' not in data or not data.get('question'):
            return jsonify({'error': 'question is required'}), 400
        
        # For students, validate they own the session if provided
        session_id = data.get('session_id')
        if current_user.role == 'student' and session_id and current_user.student:
            # Verify student owns this session
            result = db.session.execute(
                text('''
                    SELECT 1 FROM student_chat_sessions
                    WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
                '''),
                {
                    'student_id': current_user.student.id,
                    'chat_id': chat_id,
                    'session_id': session_id
                }
            ).fetchone()
            if not result:
                return jsonify({'error': 'You do not have access to this session'}), 403
        
        # Prepare request body
        request_body = {
            'question': data['question'].strip()
        }
        
        # Add optional fields
        if 'stream' in data:
            request_body['stream'] = bool(data['stream'])
        else:
            request_body['stream'] = True  # Default to streaming
        
        if session_id:
            request_body['session_id'] = session_id
        
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


from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import admin_or_instructor_required, student_required, get_current_user
from models import db
from config import Config
from sqlalchemy import text
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

def check_student_chat_access(chat_id, student_id):
    """Check if a student has access to a chat (direct or via group)"""
    # Check direct assignment
    result = db.session.execute(
        text('SELECT 1 FROM chat_student_association WHERE chat_id = :chat_id AND student_id = :student_id'),
        {'chat_id': chat_id, 'student_id': student_id}
    ).fetchone()
    if result:
        return True
    
    # Check group assignment
    result = db.session.execute(
        text('''
            SELECT 1 FROM chat_student_group_association cga
            INNER JOIN student_group_association sga ON cga.student_group_id = sga.group_id
            WHERE cga.chat_id = :chat_id AND sga.student_id = :student_id
        '''),
        {'chat_id': chat_id, 'student_id': student_id}
    ).fetchone()
    
    return result is not None

@ragflow_sessions_bp.route('/chats/<chat_id>/sessions', methods=['POST'])
def create_session(chat_id):
    """Create a session with a chat assistant"""
    try:
        current_user = get_current_user()
        
        # Check access for students
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
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
            session_data = response_data.get('data', {})
            session_id = session_data.get('id')
            
            # If student created the session, track it in our database
            if current_user.role == 'student' and session_id and current_user.student:
                try:
                    db.session.execute(
                        text('''
                            INSERT INTO student_chat_sessions (student_id, chat_id, session_id, created_at)
                            VALUES (:student_id, :chat_id, :session_id, NOW())
                            ON DUPLICATE KEY UPDATE created_at = NOW()
                        '''),
                        {
                            'student_id': current_user.student.id,
                            'chat_id': chat_id,
                            'session_id': session_id
                        }
                    )
                    db.session.commit()
                    print(f"[create_session] Tracked session {session_id} for student {current_user.student.id}")
                except Exception as e:
                    print(f"[create_session] Error tracking session: {e}")
                    db.session.rollback()
                    # Don't fail the request if tracking fails
            
            return jsonify({
                'success': True,
                'session': session_data
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
def update_session(chat_id, session_id):
    """Update a session of a chat assistant"""
    try:
        current_user = get_current_user()
        
        # Check access for students
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
        # For students, verify they own this session
        if current_user.role == 'student' and current_user.student:
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
@jwt_required()
def list_sessions(chat_id):
    """List sessions of a chat assistant"""
    try:
        current_user = get_current_user()
        
        # Check access for students
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
        # For students, get only their session IDs from our database
        student_session_ids = []
        if current_user.role == 'student' and current_user.student:
            result = db.session.execute(
                text('''
                    SELECT session_id FROM student_chat_sessions
                    WHERE student_id = :student_id AND chat_id = :chat_id
                '''),
                {'student_id': current_user.student.id, 'chat_id': chat_id}
            )
            student_session_ids = [row[0] for row in result]
        
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
            sessions = response_data.get('data', [])
            
            # For students, filter to only show their own sessions
            if current_user.role == 'student':
                if student_session_ids:
                    # Filter to only sessions the student created
                    sessions = [s for s in sessions if s.get('id') in student_session_ids]
                    print(f"[list_sessions] Filtered to {len(sessions)} student sessions out of {len(response_data.get('data', []))} total")
                    
                    # Get evaluation scores for student's sessions
                    if sessions:
                        session_ids = [s.get('id') for s in sessions if s.get('id')]
                        if session_ids:
                            if len(session_ids) == 1:
                                eval_result = db.session.execute(
                                    text('''
                                        SELECT session_id, overall_score
                                        FROM evaluation_reports
                                        WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
                                    '''),
                                    {
                                        'student_id': current_user.student.id,
                                        'chat_id': chat_id,
                                        'session_id': session_ids[0]
                                    }
                                )
                            else:
                                eval_result = db.session.execute(
                                    text('''
                                        SELECT session_id, overall_score
                                        FROM evaluation_reports
                                        WHERE student_id = :student_id AND chat_id = :chat_id AND session_id IN :session_ids
                                    '''),
                                    {
                                        'student_id': current_user.student.id,
                                        'chat_id': chat_id,
                                        'session_ids': tuple(session_ids)
                                    }
                                )
                            
                            # Create a map of session_id to evaluation score
                            evaluation_map = {}
                            for row in eval_result:
                                evaluation_map[row[0]] = row[1]
                            
                            # Add evaluation score to each session
                            for session in sessions:
                                session_id = session.get('id')
                                if session_id in evaluation_map:
                                    session['evaluation_score'] = evaluation_map[session_id]
                                else:
                                    session['evaluation_score'] = None
                else:
                    # Student has no sessions yet, return empty list
                    sessions = []
                    print(f"[list_sessions] Student has no sessions for this chat, returning empty list")
            else:
                # For admin/instructor, enrich sessions with student information
                session_ids = [s.get('id') for s in sessions if s.get('id')]
                if session_ids:
                    # Get student information for each session
                    # Build IN clause safely for SQL
                    if len(session_ids) == 1:
                        result = db.session.execute(
                            text('''
                                SELECT 
                                    scs.session_id,
                                    s.id as student_id,
                                    s.first_name,
                                    s.last_name,
                                    s.student_id as student_id_number,
                                    u.email
                                FROM student_chat_sessions scs
                                INNER JOIN student s ON scs.student_id = s.id
                                INNER JOIN user u ON s.user_id = u.id
                                WHERE scs.chat_id = :chat_id AND scs.session_id = :session_id
                            '''),
                            {
                                'chat_id': chat_id,
                                'session_id': session_ids[0]
                            }
                        )
                    else:
                        # For multiple session IDs, use tuple in parameter
                        result = db.session.execute(
                            text('''
                                SELECT 
                                    scs.session_id,
                                    s.id as student_id,
                                    s.first_name,
                                    s.last_name,
                                    s.student_id as student_id_number,
                                    u.email
                                FROM student_chat_sessions scs
                                INNER JOIN student s ON scs.student_id = s.id
                                INNER JOIN user u ON s.user_id = u.id
                                WHERE scs.chat_id = :chat_id AND scs.session_id IN :session_ids
                            '''),
                            {
                                'chat_id': chat_id,
                                'session_ids': tuple(session_ids)
                            }
                        )
                    
                    # Create a map of session_id to student info
                    student_info_map = {}
                    for row in result:
                        student_info_map[row[0]] = {
                            'student_id': row[1],
                            'first_name': row[2],
                            'last_name': row[3],
                            'student_id_number': row[4],
                            'email': row[5]
                        }
                    
                    # Get evaluation scores for each session
                    if len(session_ids) == 1:
                        eval_result = db.session.execute(
                            text('''
                                SELECT session_id, overall_score
                                FROM evaluation_reports
                                WHERE chat_id = :chat_id AND session_id = :session_id
                            '''),
                            {
                                'chat_id': chat_id,
                                'session_id': session_ids[0]
                            }
                        )
                    else:
                        eval_result = db.session.execute(
                            text('''
                                SELECT session_id, overall_score
                                FROM evaluation_reports
                                WHERE chat_id = :chat_id AND session_id IN :session_ids
                            '''),
                            {
                                'chat_id': chat_id,
                                'session_ids': tuple(session_ids)
                            }
                        )
                    
                    # Create a map of session_id to evaluation score
                    evaluation_map = {}
                    for row in eval_result:
                        evaluation_map[row[0]] = row[1]
                    
                    # Add student info and evaluation score to each session
                    for session in sessions:
                        session_id = session.get('id')
                        if session_id in student_info_map:
                            session['created_by_student'] = student_info_map[session_id]
                        else:
                            session['created_by_student'] = None
                        
                        # Add evaluation score if available
                        if session_id in evaluation_map:
                            session['evaluation_score'] = evaluation_map[session_id]
                        else:
                            session['evaluation_score'] = None
            
            return jsonify({
                'success': True,
                'sessions': sessions
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
@jwt_required()
def delete_sessions(chat_id):
    """Delete sessions of a chat assistant (supports bulk delete)"""
    try:
        current_user = get_current_user()
        
        # Students can only delete their own sessions
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
        data = request.get_json() or {}
        
        # ids is optional - if not provided, all sessions will be deleted
        ids = data.get('ids')
        
        # For students, filter to only their own session IDs
        if current_user.role == 'student' and current_user.student:
            if ids:
                # Verify student owns all these sessions
                result = db.session.execute(
                    text('''
                        SELECT session_id FROM student_chat_sessions
                        WHERE student_id = :student_id AND chat_id = :chat_id AND session_id IN :session_ids
                    '''),
                    {
                        'student_id': current_user.student.id,
                        'chat_id': chat_id,
                        'session_ids': tuple(ids) if ids else tuple()
                    }
                )
                student_session_ids = [row[0] for row in result]
                # Only allow deletion of sessions the student owns
                ids = [sid for sid in ids if sid in student_session_ids]
                if not ids:
                    return jsonify({'error': 'No valid sessions found to delete'}), 400
            else:
                # If no IDs provided, get all student's session IDs for this chat
                result = db.session.execute(
                    text('''
                        SELECT session_id FROM student_chat_sessions
                        WHERE student_id = :student_id AND chat_id = :chat_id
                    '''),
                    {'student_id': current_user.student.id, 'chat_id': chat_id}
                )
                ids = [row[0] for row in result]
                if not ids:
                    return jsonify({'error': 'No sessions found to delete'}), 404
        
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
            # If student deleted sessions, remove them from our tracking table
            if current_user.role == 'student' and current_user.student and ids:
                try:
                    for session_id in ids:
                        db.session.execute(
                            text('''
                                DELETE FROM student_chat_sessions
                                WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
                            '''),
                            {
                                'student_id': current_user.student.id,
                                'chat_id': chat_id,
                                'session_id': session_id
                            }
                        )
                    db.session.commit()
                    print(f"[delete_sessions] Removed {len(ids)} sessions from tracking for student {current_user.student.id}")
                except Exception as e:
                    print(f"[delete_sessions] Error removing sessions from tracking: {e}")
                    db.session.rollback()
            
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


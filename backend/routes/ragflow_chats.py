from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import admin_or_instructor_required, student_required, get_current_user
from models import db
from config import Config
from sqlalchemy import text
import requests

ragflow_chats_bp = Blueprint('ragflow_chats', __name__)

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

@ragflow_chats_bp.route('/chats', methods=['POST'])
@admin_or_instructor_required
def create_chat():
    """Create a chat assistant in RAGFlow"""
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
        if 'avatar' in data:
            request_body['avatar'] = data['avatar']
        
        if 'description' in data:
            request_body['description'] = data['description'].strip()
        
        if 'dataset_ids' in data:
            if isinstance(data['dataset_ids'], list):
                request_body['dataset_ids'] = data['dataset_ids']
            else:
                return jsonify({'error': 'dataset_ids must be a list'}), 400
        
        if 'llm' in data:
            if isinstance(data['llm'], dict):
                llm_config = {}
                if 'model_name' in data['llm']:
                    llm_config['model_name'] = data['llm']['model_name']
                if 'temperature' in data['llm']:
                    try:
                        llm_config['temperature'] = float(data['llm']['temperature'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'temperature must be a float'}), 400
                if 'top_p' in data['llm']:
                    try:
                        llm_config['top_p'] = float(data['llm']['top_p'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_p must be a float'}), 400
                if 'presence_penalty' in data['llm']:
                    try:
                        llm_config['presence_penalty'] = float(data['llm']['presence_penalty'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'presence_penalty must be a float'}), 400
                if 'frequency_penalty' in data['llm']:
                    try:
                        llm_config['frequency_penalty'] = float(data['llm']['frequency_penalty'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'frequency_penalty must be a float'}), 400
                if 'reasoning' in data['llm']:
                    if isinstance(data['llm']['reasoning'], bool):
                        llm_config['reasoning'] = data['llm']['reasoning']
                    else:
                        return jsonify({'error': 'reasoning must be a boolean'}), 400
                request_body['llm'] = llm_config
        
        if 'prompt' in data:
            if isinstance(data['prompt'], dict):
                # Keys that RAGFlow moves to root level (should NOT be in prompt_config)
                keys_to_move_to_root = ["similarity_threshold", "vector_similarity_weight", "top_n", "rerank_id", "top_k"]
                
                # Start with all prompt fields, then handle special cases
                prompt_config = {}
                
                # Copy all fields from prompt to prompt_config (except those that go to root)
                for key, value in data['prompt'].items():
                    if key not in keys_to_move_to_root:
                        prompt_config[key] = value
                
                # Handle fields that go to root level
                if 'similarity_threshold' in data['prompt']:
                    try:
                        request_body['similarity_threshold'] = float(data['prompt']['similarity_threshold'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'similarity_threshold must be a float'}), 400
                
                if 'keywords_similarity_weight' in data['prompt']:
                    try:
                        request_body['vector_similarity_weight'] = float(data['prompt']['keywords_similarity_weight'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'keywords_similarity_weight must be a float'}), 400
                
                if 'top_n' in data['prompt']:
                    try:
                        request_body['top_n'] = int(data['prompt']['top_n'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_n must be an integer'}), 400
                
                if 'top_k' in data['prompt']:
                    try:
                        request_body['top_k'] = int(data['prompt']['top_k'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_k must be an integer'}), 400
                
                if 'rerank_model' in data['prompt']:
                    request_body['rerank_id'] = data['prompt']['rerank_model']
                
                # Validate specific fields
                if 'variables' in prompt_config and not isinstance(prompt_config['variables'], list):
                    return jsonify({'error': 'variables must be a list'}), 400
                
                if 'show_quote' in prompt_config and not isinstance(prompt_config['show_quote'], bool):
                    return jsonify({'error': 'show_quote must be a boolean'}), 400
                
                if 'keyword_analysis' in prompt_config and not isinstance(prompt_config['keyword_analysis'], bool):
                    return jsonify({'error': 'keyword_analysis must be a boolean'}), 400
                
                # Handle cross_languages - validate it's a list (values should already be capitalized from frontend)
                if 'cross_languages' in prompt_config:
                    if isinstance(prompt_config['cross_languages'], list):
                        # Validate and filter to only valid languages
                        valid_languages = ['English', 'Chinese', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Vietnamese']
                        filtered_languages = [lang for lang in prompt_config['cross_languages'] if lang in valid_languages]
                        prompt_config['cross_languages'] = filtered_languages
                    elif prompt_config['cross_languages'] is None:
                        # Allow None, but convert to empty list for consistency
                        prompt_config['cross_languages'] = []
                    else:
                        return jsonify({'error': 'cross_languages must be a list'}), 400
                
                request_body['prompt'] = prompt_config
        
        # Debug: Log the request body to verify cross_languages is included
        import logging
        logging.debug(f"Request body prompt_config: {request_body.get('prompt', {}).get('cross_languages', 'NOT SET')}")
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/chats',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            # Verify cross_languages was saved by checking the response
            saved_chat = response_data.get('data', {})
            saved_prompt = saved_chat.get('prompt', {})
            logging.debug(f"Saved cross_languages: {saved_prompt.get('cross_languages', 'NOT FOUND')}")
            
            return jsonify({
                'success': True,
                'chat': saved_chat
            }), 201
        else:
            error_message = response_data.get('message', 'Failed to create chat assistant')
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


@ragflow_chats_bp.route('/chats/<chat_id>', methods=['PUT'])
@admin_or_instructor_required
def update_chat(chat_id):
    """Update a chat assistant in RAGFlow"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'name' in data and not data.get('name'):
            return jsonify({'error': 'name cannot be empty'}), 400
        
        # Prepare request body
        request_body = {}
        
        # Add optional fields
        if 'name' in data:
            request_body['name'] = data['name'].strip()
        
        if 'avatar' in data:
            request_body['avatar'] = data['avatar']
        
        if 'description' in data:
            request_body['description'] = data['description'].strip()
        
        if 'dataset_ids' in data:
            if isinstance(data['dataset_ids'], list):
                request_body['dataset_ids'] = data['dataset_ids']
            else:
                return jsonify({'error': 'dataset_ids must be a list'}), 400
        
        if 'llm' in data:
            if isinstance(data['llm'], dict):
                llm_config = {}
                if 'model_name' in data['llm']:
                    llm_config['model_name'] = data['llm']['model_name']
                if 'temperature' in data['llm']:
                    try:
                        llm_config['temperature'] = float(data['llm']['temperature'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'temperature must be a float'}), 400
                if 'top_p' in data['llm']:
                    try:
                        llm_config['top_p'] = float(data['llm']['top_p'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_p must be a float'}), 400
                if 'presence_penalty' in data['llm']:
                    try:
                        llm_config['presence_penalty'] = float(data['llm']['presence_penalty'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'presence_penalty must be a float'}), 400
                if 'frequency_penalty' in data['llm']:
                    try:
                        llm_config['frequency_penalty'] = float(data['llm']['frequency_penalty'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'frequency_penalty must be a float'}), 400
                if 'reasoning' in data['llm']:
                    if isinstance(data['llm']['reasoning'], bool):
                        llm_config['reasoning'] = data['llm']['reasoning']
                    else:
                        return jsonify({'error': 'reasoning must be a boolean'}), 400
                request_body['llm'] = llm_config
        
        if 'prompt' in data:
            if isinstance(data['prompt'], dict):
                # Keys that RAGFlow moves to root level (should NOT be in prompt_config)
                keys_to_move_to_root = ["similarity_threshold", "vector_similarity_weight", "top_n", "rerank_id", "top_k"]
                
                # Start with all prompt fields, then handle special cases
                prompt_config = {}
                
                # Copy all fields from prompt to prompt_config (except those that go to root)
                for key, value in data['prompt'].items():
                    if key not in keys_to_move_to_root:
                        prompt_config[key] = value
                
                # Handle fields that go to root level
                if 'similarity_threshold' in data['prompt']:
                    try:
                        request_body['similarity_threshold'] = float(data['prompt']['similarity_threshold'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'similarity_threshold must be a float'}), 400
                
                if 'keywords_similarity_weight' in data['prompt']:
                    try:
                        request_body['vector_similarity_weight'] = float(data['prompt']['keywords_similarity_weight'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'keywords_similarity_weight must be a float'}), 400
                
                if 'top_n' in data['prompt']:
                    try:
                        request_body['top_n'] = int(data['prompt']['top_n'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_n must be an integer'}), 400
                
                if 'top_k' in data['prompt']:
                    try:
                        request_body['top_k'] = int(data['prompt']['top_k'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_k must be an integer'}), 400
                
                if 'rerank_model' in data['prompt']:
                    request_body['rerank_id'] = data['prompt']['rerank_model']
                
                # Validate specific fields
                if 'variables' in prompt_config and not isinstance(prompt_config['variables'], list):
                    return jsonify({'error': 'variables must be a list'}), 400
                
                if 'show_quote' in prompt_config and not isinstance(prompt_config['show_quote'], bool):
                    return jsonify({'error': 'show_quote must be a boolean'}), 400
                
                if 'keyword_analysis' in prompt_config and not isinstance(prompt_config['keyword_analysis'], bool):
                    return jsonify({'error': 'keyword_analysis must be a boolean'}), 400
                
                # Handle cross_languages - validate it's a list (values should already be capitalized from frontend)
                if 'cross_languages' in prompt_config:
                    if isinstance(prompt_config['cross_languages'], list):
                        # Validate and filter to only valid languages
                        valid_languages = ['English', 'Chinese', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Vietnamese']
                        filtered_languages = [lang for lang in prompt_config['cross_languages'] if lang in valid_languages]
                        prompt_config['cross_languages'] = filtered_languages
                    elif prompt_config['cross_languages'] is None:
                        # Allow None, but convert to empty list for consistency
                        prompt_config['cross_languages'] = []
                    else:
                        return jsonify({'error': 'cross_languages must be a list'}), 400
                
                request_body['prompt'] = prompt_config
        
        # Make request to RAGFlow
        response = requests.put(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Chat assistant updated successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to update chat assistant')
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

@ragflow_chats_bp.route('/chats', methods=['GET'])
@jwt_required()
def list_chats():
    """List chat assistants from RAGFlow"""
    try:
        current_user = get_current_user()
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '30')
        orderby = request.args.get('orderby', 'create_time')
        desc = request.args.get('desc', 'true')
        name = request.args.get('name')
        chat_id = request.args.get('id')
        
        # For students, check if they have access to the requested chat
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            
            # If a specific chat_id is requested, verify access
            if chat_id:
                if not check_student_chat_access(chat_id, current_user.student.id):
                    return jsonify({'error': 'You do not have access to this chat assistant'}), 403
                # Get API key for this specific chat
                api_key_to_use = get_api_key_for_user(current_user, chat_id)
            else:
                # If no specific chat_id, get all assigned chats
                # Get directly assigned chats
                result = db.session.execute(
                    text('''
                        SELECT DISTINCT csa.chat_id, csa.instructor_id
                        FROM chat_student_association csa
                        WHERE csa.student_id = :student_id
                    '''),
                    {'student_id': current_user.student.id}
                )
                direct_assignments = [(row[0], row[1]) for row in result]
                
                # Get chats assigned through groups
                result = db.session.execute(
                    text('''
                        SELECT DISTINCT cga.chat_id, cga.instructor_id
                        FROM chat_student_group_association cga
                        INNER JOIN student_group_association sga ON cga.student_group_id = sga.group_id
                        WHERE sga.student_id = :student_id
                    '''),
                    {'student_id': current_user.student.id}
                )
                group_assignments = [(row[0], row[1]) for row in result]
                
                # Combine and deduplicate
                all_chat_ids = list(set([row[0] for row in direct_assignments + group_assignments]))
                
                if not all_chat_ids:
                    return jsonify({
                        'success': True,
                        'chats': []
                    }), 200
                
                # Use the first chat's instructor API key (or global as fallback)
                chat_instructor_map = {}
                for cid, iid in direct_assignments + group_assignments:
                    if cid not in chat_instructor_map:
                        chat_instructor_map[cid] = iid
                
                instructor_id = None
                for cid in all_chat_ids:
                    if cid in chat_instructor_map and chat_instructor_map[cid]:
                        instructor_id = chat_instructor_map[cid]
                        break
                
                if instructor_id:
                    from models import Instructor
                    instructor = Instructor.query.get(instructor_id)
                    if instructor and instructor.ragflow_api_key:
                        api_key_to_use = instructor.ragflow_api_key
                    else:
                        api_key_to_use = RAGFLOW_API_KEY
                else:
                    api_key_to_use = RAGFLOW_API_KEY
                
                # Fetch all assigned chats and filter
                params = {
                    'page': '1',
                    'page_size': '1000',  # Get all to filter
                    'orderby': orderby,
                    'desc': desc
                }
                if name:
                    params['name'] = name
                
                response = requests.get(
                    f'{RAGFLOW_BASE_URL}/api/v1/chats',
                    headers=get_ragflow_headers(api_key_to_use),
                    params=params,
                    timeout=30
                )
                
                response_data = response.json()
                
                if response.status_code == 200 and response_data.get('code') == 0:
                    all_chats = response_data.get('data', [])
                    # Filter to only assigned chats
                    filtered_chats = [chat for chat in all_chats if chat.get('id') in all_chat_ids]
                    return jsonify({
                        'success': True,
                        'chats': filtered_chats
                    }), 200
                else:
                    error_message = response_data.get('message', 'Failed to fetch chat assistants')
                    return jsonify({
                        'error': error_message,
                        'code': response_data.get('code', -1)
                    }), response.status_code if response.status_code != 200 else 400
        elif current_user.role not in ['admin', 'instructor']:
            return jsonify({'error': 'Access denied'}), 403
        else:
            # Admin or instructor - use their API key
            api_key_to_use = get_api_key_for_user(current_user)
        
        # Build query string for admin/instructor
        params = {
            'page': page,
            'page_size': page_size,
            'orderby': orderby,
            'desc': desc
        }
        if name:
            params['name'] = name
        if chat_id:
            params['id'] = chat_id
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/chats',
            headers=get_ragflow_headers(api_key_to_use),
            params=params,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'chats': response_data.get('data', [])
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch chat assistants')
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

@ragflow_chats_bp.route('/chats', methods=['DELETE'])
@admin_or_instructor_required
def delete_chats():
    """Delete chat assistants from RAGFlow (supports bulk delete)"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate ids parameter
        if 'ids' not in data:
            return jsonify({'error': 'ids parameter is required'}), 400
        
        ids = data.get('ids')
        
        # ids can be null (delete all), empty array (delete none), or array of IDs
        if ids is not None and not isinstance(ids, list):
            return jsonify({'error': 'ids must be null or an array of strings'}), 400
        
        if isinstance(ids, list):
            # Validate all IDs are strings
            for chat_id in ids:
                if not isinstance(chat_id, str):
                    return jsonify({'error': 'All chat IDs must be strings'}), 400
        
        request_body = {'ids': ids}
        
        # Make request to RAGFlow
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/chats',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            # Clean up assignments for deleted chats
            if ids:
                for chat_id in ids:
                    try:
                        # Delete student assignments
                        db.session.execute(
                            text('DELETE FROM chat_student_association WHERE chat_id = :chat_id'),
                            {'chat_id': chat_id}
                        )
                        # Delete group assignments
                        db.session.execute(
                            text('DELETE FROM chat_student_group_association WHERE chat_id = :chat_id'),
                            {'chat_id': chat_id}
                        )
                        # Delete student session tracking
                        db.session.execute(
                            text('DELETE FROM student_chat_sessions WHERE chat_id = :chat_id'),
                            {'chat_id': chat_id}
                        )
                        # Delete evaluation reports for this chat
                        db.session.execute(
                            text('DELETE FROM evaluation_reports WHERE chat_id = :chat_id'),
                            {'chat_id': chat_id}
                        )
                        print(f"[delete_chats] Cleaned up assignments and sessions for deleted chat {chat_id}")
                    except Exception as e:
                        print(f"[delete_chats] Error cleaning up assignments for chat {chat_id}: {e}")
                        # Continue with other chats even if one fails
                
                db.session.commit()
            elif ids is None:
                # Delete all chats - clean up all assignments
                try:
                    db.session.execute(text('DELETE FROM chat_student_association'))
                    db.session.execute(text('DELETE FROM chat_student_group_association'))
                    db.session.execute(text('DELETE FROM student_chat_sessions'))
                    db.session.execute(text('DELETE FROM evaluation_reports'))
                    db.session.commit()
                    print(f"[delete_chats] Cleaned up all chat assignments")
                except Exception as e:
                    print(f"[delete_chats] Error cleaning up all assignments: {e}")
                    db.session.rollback()
            
            return jsonify({
                'success': True,
                'message': 'Chat assistant(s) deleted successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to delete chat assistants')
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

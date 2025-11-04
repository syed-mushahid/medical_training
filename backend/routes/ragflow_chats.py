from flask import Blueprint, request, jsonify
from utils import admin_or_instructor_required, get_current_user
from config import Config
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
                request_body['llm'] = llm_config
        
        if 'prompt' in data:
            if isinstance(data['prompt'], dict):
                prompt_config = {}
                if 'similarity_threshold' in data['prompt']:
                    try:
                        prompt_config['similarity_threshold'] = float(data['prompt']['similarity_threshold'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'similarity_threshold must be a float'}), 400
                if 'keywords_similarity_weight' in data['prompt']:
                    try:
                        prompt_config['keywords_similarity_weight'] = float(data['prompt']['keywords_similarity_weight'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'keywords_similarity_weight must be a float'}), 400
                if 'top_n' in data['prompt']:
                    try:
                        prompt_config['top_n'] = int(data['prompt']['top_n'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_n must be an integer'}), 400
                if 'variables' in data['prompt']:
                    if isinstance(data['prompt']['variables'], list):
                        prompt_config['variables'] = data['prompt']['variables']
                    else:
                        return jsonify({'error': 'variables must be a list'}), 400
                if 'rerank_model' in data['prompt']:
                    prompt_config['rerank_model'] = data['prompt']['rerank_model']
                if 'empty_response' in data['prompt']:
                    prompt_config['empty_response'] = data['prompt']['empty_response']
                if 'opener' in data['prompt']:
                    prompt_config['opener'] = data['prompt']['opener']
                if 'show_quote' in data['prompt']:
                    if isinstance(data['prompt']['show_quote'], bool):
                        prompt_config['show_quote'] = data['prompt']['show_quote']
                    else:
                        return jsonify({'error': 'show_quote must be a boolean'}), 400
                if 'prompt' in data['prompt']:
                    prompt_config['prompt'] = data['prompt']['prompt']
                if 'top_k' in data['prompt']:
                    try:
                        prompt_config['top_k'] = int(data['prompt']['top_k'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_k must be an integer'}), 400
                request_body['prompt'] = prompt_config
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/chats',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'chat': response_data.get('data', {})
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
                request_body['llm'] = llm_config
        
        if 'prompt' in data:
            if isinstance(data['prompt'], dict):
                prompt_config = {}
                if 'similarity_threshold' in data['prompt']:
                    try:
                        prompt_config['similarity_threshold'] = float(data['prompt']['similarity_threshold'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'similarity_threshold must be a float'}), 400
                if 'keywords_similarity_weight' in data['prompt']:
                    try:
                        prompt_config['keywords_similarity_weight'] = float(data['prompt']['keywords_similarity_weight'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'keywords_similarity_weight must be a float'}), 400
                if 'top_n' in data['prompt']:
                    try:
                        prompt_config['top_n'] = int(data['prompt']['top_n'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_n must be an integer'}), 400
                if 'variables' in data['prompt']:
                    if isinstance(data['prompt']['variables'], list):
                        prompt_config['variables'] = data['prompt']['variables']
                    else:
                        return jsonify({'error': 'variables must be a list'}), 400
                if 'rerank_model' in data['prompt']:
                    prompt_config['rerank_model'] = data['prompt']['rerank_model']
                if 'empty_response' in data['prompt']:
                    prompt_config['empty_response'] = data['prompt']['empty_response']
                if 'opener' in data['prompt']:
                    prompt_config['opener'] = data['prompt']['opener']
                if 'show_quote' in data['prompt']:
                    if isinstance(data['prompt']['show_quote'], bool):
                        prompt_config['show_quote'] = data['prompt']['show_quote']
                    else:
                        return jsonify({'error': 'show_quote must be a boolean'}), 400
                if 'prompt' in data['prompt']:
                    prompt_config['prompt'] = data['prompt']['prompt']
                if 'top_k' in data['prompt']:
                    try:
                        prompt_config['top_k'] = int(data['prompt']['top_k'])
                    except (ValueError, TypeError):
                        return jsonify({'error': 'top_k must be an integer'}), 400
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
@admin_or_instructor_required
def list_chats():
    """List chat assistants from RAGFlow"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '30')
        orderby = request.args.get('orderby', 'create_time')
        desc = request.args.get('desc', 'true')
        name = request.args.get('name')
        chat_id = request.args.get('id')
        
        # Build query string
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

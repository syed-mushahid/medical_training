from flask import Blueprint, request, jsonify
from utils import admin_or_instructor_required, get_current_user
from config import Config
import requests

ragflow_bp = Blueprint('ragflow', __name__)

RAGFLOW_BASE_URL = Config.RAGFLOW_BASE_URL
RAGFLOW_API_KEY = Config.RAGFLOW_API_KEY

def get_ragflow_headers(api_key=None):
    """Get headers for RAGFlow API requests"""
    # Use provided API key, or fall back to global config, or use instructor's key
    key = api_key or RAGFLOW_API_KEY
    if not key:
        raise ValueError('RAGFlow API key is required')
    
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {key}'
    }

@ragflow_bp.route('/datasets', methods=['POST'])
@admin_or_instructor_required
def create_dataset():
    """Create a dataset in RAGFlow"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key = current_instructor.ragflow_api_key
            if not api_key:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({'error': 'Dataset name is required'}), 400
        
        # Validate name
        name = data['name'].strip()
        if len(name) > 128:
            return jsonify({'error': 'Dataset name must be 128 characters or less'}), 400
        
        if not name:
            return jsonify({'error': 'Dataset name cannot be empty'}), 400
        
        # Prepare request body
        request_body = {
            'name': name
        }
        
        # Add optional fields if provided
        if data.get('avatar'):
            if len(data['avatar']) > 65535:
                return jsonify({'error': 'Avatar base64 string must be 65535 characters or less'}), 400
            request_body['avatar'] = data['avatar']
        
        if data.get('description'):
            if len(data['description']) > 65535:
                return jsonify({'error': 'Description must be 65535 characters or less'}), 400
            request_body['description'] = data['description']
        
        if data.get('embedding_model'):
            if len(data['embedding_model']) > 255:
                return jsonify({'error': 'Embedding model name must be 255 characters or less'}), 400
            if '@' not in data['embedding_model']:
                return jsonify({'error': 'Embedding model must follow model_name@model_factory format'}), 400
            request_body['embedding_model'] = data['embedding_model']
        
        if data.get('permission'):
            if data['permission'] not in ['me', 'team']:
                return jsonify({'error': 'Permission must be either "me" or "team"'}), 400
            request_body['permission'] = data['permission']
        
        if data.get('chunk_method'):
            valid_chunk_methods = ['naive', 'book', 'email', 'laws', 'manual', 'one', 'paper', 
                                   'picture', 'presentation', 'qa', 'table', 'tag']
            if data['chunk_method'] not in valid_chunk_methods:
                return jsonify({'error': f'Invalid chunk_method. Must be one of: {", ".join(valid_chunk_methods)}'}), 400
            request_body['chunk_method'] = data['chunk_method']
        
        # Handle parser_config based on chunk_method
        chunk_method = request_body.get('chunk_method', 'naive')
        if data.get('parser_config'):
            parser_config = data['parser_config']
            
            if chunk_method == 'naive':
                # Validate naive parser_config
                if 'auto_keywords' in parser_config:
                    val = parser_config['auto_keywords']
                    if not isinstance(val, int) or val < 0 or val > 32:
                        return jsonify({'error': 'auto_keywords must be an integer between 0 and 32'}), 400
                
                if 'auto_questions' in parser_config:
                    val = parser_config['auto_questions']
                    if not isinstance(val, int) or val < 0 or val > 10:
                        return jsonify({'error': 'auto_questions must be an integer between 0 and 10'}), 400
                
                if 'chunk_token_num' in parser_config:
                    val = parser_config['chunk_token_num']
                    if not isinstance(val, int) or val < 1 or val > 2048:
                        return jsonify({'error': 'chunk_token_num must be an integer between 1 and 2048'}), 400
                
                if 'html4excel' in parser_config and not isinstance(parser_config['html4excel'], bool):
                    return jsonify({'error': 'html4excel must be a boolean'}), 400
                
                if 'task_page_size' in parser_config:
                    val = parser_config['task_page_size']
                    if not isinstance(val, int) or val < 1:
                        return jsonify({'error': 'task_page_size must be an integer >= 1'}), 400
                
                if 'tag_kb_ids' in parser_config:
                    if not isinstance(parser_config['tag_kb_ids'], list):
                        return jsonify({'error': 'tag_kb_ids must be an array'}), 400
                    for item in parser_config['tag_kb_ids']:
                        if not isinstance(item, str):
                            return jsonify({'error': 'All items in tag_kb_ids must be strings'}), 400
            
            request_body['parser_config'] = parser_config
        
        # Determine which API key to use
        # Priority: 1. Instructor's API key, 2. Global config API key
        api_key_to_use = None
        if current_user.role == 'instructor' and current_instructor:
            api_key_to_use = current_instructor.ragflow_api_key
        elif current_user.role == 'admin':
            # Admin can use global key or specify in request (for future use)
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'dataset': response_data.get('data')
            }), 201
        else:
            error_message = response_data.get('message', 'Failed to create dataset')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/datasets', methods=['GET'])
@admin_or_instructor_required
def list_datasets():
    """List datasets from RAGFlow with optional filters"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '30')
        orderby = request.args.get('orderby', 'create_time')
        desc = request.args.get('desc', 'true')
        name = request.args.get('name')
        dataset_id = request.args.get('id')
        
        # Build query string
        params = {
            'page': page,
            'page_size': page_size,
            'orderby': orderby,
            'desc': desc
        }
        if name:
            params['name'] = name
        if dataset_id:
            params['id'] = dataset_id
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets',
            headers=get_ragflow_headers(api_key_to_use),
            params=params,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'datasets': response_data.get('data', [])
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch datasets')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/datasets/<dataset_id>', methods=['PUT'])
@admin_or_instructor_required
def update_dataset(dataset_id):
    """Update a dataset in RAGFlow"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        data = request.get_json() or {}
        
        # Prepare request body with only provided fields
        request_body = {}
        
        # Validate and add optional fields if provided
        if 'name' in data:
            name = data['name'].strip() if data['name'] else ''
            if len(name) > 128:
                return jsonify({'error': 'Dataset name must be 128 characters or less'}), 400
            request_body['name'] = name
        
        if 'avatar' in data:
            if data['avatar'] and len(data['avatar']) > 65535:
                return jsonify({'error': 'Avatar base64 string must be 65535 characters or less'}), 400
            request_body['avatar'] = data.get('avatar')
        
        if 'description' in data:
            if data['description'] and len(data['description']) > 65535:
                return jsonify({'error': 'Description must be 65535 characters or less'}), 400
            request_body['description'] = data.get('description')
        
        if 'embedding_model' in data:
            if data['embedding_model']:
                if len(data['embedding_model']) > 255:
                    return jsonify({'error': 'Embedding model name must be 255 characters or less'}), 400
                if '@' not in data['embedding_model']:
                    return jsonify({'error': 'Embedding model must follow model_name@model_factory format'}), 400
            request_body['embedding_model'] = data.get('embedding_model')
        
        if 'permission' in data:
            if data['permission'] and data['permission'] not in ['me', 'team']:
                return jsonify({'error': 'Permission must be either "me" or "team"'}), 400
            request_body['permission'] = data.get('permission')
        
        if 'pagerank' in data:
            val = data['pagerank']
            if val is not None:
                try:
                    val = int(val)
                    if val < 0 or val > 100:
                        return jsonify({'error': 'pagerank must be between 0 and 100'}), 400
                    request_body['pagerank'] = val
                except (ValueError, TypeError):
                    return jsonify({'error': 'pagerank must be an integer'}), 400
        
        if 'chunk_method' in data:
            if data['chunk_method']:
                valid_chunk_methods = ['naive', 'book', 'email', 'laws', 'manual', 'one', 'paper', 
                                       'picture', 'presentation', 'qa', 'table', 'tag']
                if data['chunk_method'] not in valid_chunk_methods:
                    return jsonify({'error': f'Invalid chunk_method. Must be one of: {", ".join(valid_chunk_methods)}'}), 400
            request_body['chunk_method'] = data.get('chunk_method')
        
        # Handle parser_config based on chunk_method
        chunk_method = request_body.get('chunk_method') or data.get('chunk_method')
        if 'parser_config' in data and data['parser_config']:
            parser_config = data['parser_config']
            
            if chunk_method == 'naive':
                # Validate naive parser_config
                if 'auto_keywords' in parser_config:
                    val = parser_config['auto_keywords']
                    try:
                        val = int(val)
                        if val < 0 or val > 32:
                            return jsonify({'error': 'auto_keywords must be between 0 and 32'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'auto_keywords must be an integer'}), 400
                
                if 'auto_questions' in parser_config:
                    val = parser_config['auto_questions']
                    try:
                        val = int(val)
                        if val < 0 or val > 10:
                            return jsonify({'error': 'auto_questions must be between 0 and 10'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'auto_questions must be an integer'}), 400
                
                if 'chunk_token_num' in parser_config:
                    val = parser_config['chunk_token_num']
                    try:
                        val = int(val)
                        if val < 1 or val > 2048:
                            return jsonify({'error': 'chunk_token_num must be between 1 and 2048'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'chunk_token_num must be an integer'}), 400
                
                if 'html4excel' in parser_config and not isinstance(parser_config['html4excel'], bool):
                    return jsonify({'error': 'html4excel must be a boolean'}), 400
                
                if 'task_page_size' in parser_config:
                    val = parser_config['task_page_size']
                    try:
                        val = int(val)
                        if val < 1:
                            return jsonify({'error': 'task_page_size must be >= 1'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'task_page_size must be an integer'}), 400
                
                if 'tag_kb_ids' in parser_config:
                    if not isinstance(parser_config['tag_kb_ids'], list):
                        return jsonify({'error': 'tag_kb_ids must be an array'}), 400
                    for item in parser_config['tag_kb_ids']:
                        if not isinstance(item, str):
                            return jsonify({'error': 'All items in tag_kb_ids must be strings'}), 400
            
            request_body['parser_config'] = parser_config
        
        # Make request to RAGFlow
        response = requests.put(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Dataset updated successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to update dataset')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/datasets', methods=['DELETE'])
@admin_or_instructor_required
def delete_datasets():
    """Delete datasets from RAGFlow"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
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
            for dataset_id in ids:
                if not isinstance(dataset_id, str):
                    return jsonify({'error': 'All dataset IDs must be strings'}), 400
        
        request_body = {'ids': ids}
        
        # Make request to RAGFlow
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Dataset(s) deleted successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to delete datasets')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/datasets/<dataset_id>/knowledge_graph', methods=['GET'])
@admin_or_instructor_required
def get_knowledge_graph(dataset_id):
    """Get knowledge graph of a dataset"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/knowledge_graph',
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'knowledge_graph': response_data.get('data', {})
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch knowledge graph')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/datasets/<dataset_id>/knowledge_graph', methods=['DELETE'])
@admin_or_instructor_required
def delete_knowledge_graph(dataset_id):
    """Delete knowledge graph of a dataset"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/knowledge_graph',
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Knowledge graph deleted successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to delete knowledge graph')
            return jsonify({
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_bp.route('/retrieval', methods=['POST', 'OPTIONS'])
@admin_or_instructor_required
def retrieval():
    """Retrieve chunks from datasets using semantic search"""
    try:
        current_user = get_current_user()
        current_instructor = None
        
        # Get instructor's API key if current user is an instructor
        api_key_to_use = None
        if current_user.role == 'instructor' and current_user.instructor:
            current_instructor = current_user.instructor
            api_key_to_use = current_instructor.ragflow_api_key
            if not api_key_to_use:
                return jsonify({'error': 'RAGFlow API key is not configured for this instructor. Please contact admin to set it up.'}), 400
        elif current_user.role == 'admin':
            api_key_to_use = RAGFLOW_API_KEY
        
        if not api_key_to_use:
            return jsonify({'error': 'RAGFlow API key is not configured'}), 400
        
        data = request.get_json() or {}
        
        # Validate required fields
        if 'question' not in data or not data.get('question'):
            return jsonify({'error': 'question is required'}), 400
        
        if not data.get('dataset_ids') and not data.get('document_ids'):
            return jsonify({'error': 'Either dataset_ids or document_ids is required'}), 400
        
        # Prepare request body
        request_body = {
            'question': data['question'].strip()
        }
        
        # Add optional fields
        if data.get('dataset_ids'):
            if not isinstance(data['dataset_ids'], list):
                return jsonify({'error': 'dataset_ids must be an array'}), 400
            request_body['dataset_ids'] = data['dataset_ids']
        
        if data.get('document_ids'):
            if not isinstance(data['document_ids'], list):
                return jsonify({'error': 'document_ids must be an array'}), 400
            request_body['document_ids'] = data['document_ids']
        
        if 'page' in data:
            try:
                request_body['page'] = int(data['page'])
            except (ValueError, TypeError):
                return jsonify({'error': 'page must be an integer'}), 400
        
        if 'page_size' in data:
            try:
                request_body['page_size'] = int(data['page_size'])
            except (ValueError, TypeError):
                return jsonify({'error': 'page_size must be an integer'}), 400
        
        if 'similarity_threshold' in data:
            try:
                request_body['similarity_threshold'] = float(data['similarity_threshold'])
            except (ValueError, TypeError):
                return jsonify({'error': 'similarity_threshold must be a number'}), 400
        
        if 'vector_similarity_weight' in data:
            try:
                request_body['vector_similarity_weight'] = float(data['vector_similarity_weight'])
            except (ValueError, TypeError):
                return jsonify({'error': 'vector_similarity_weight must be a number'}), 400
        
        if 'top_k' in data:
            try:
                request_body['top_k'] = int(data['top_k'])
            except (ValueError, TypeError):
                return jsonify({'error': 'top_k must be an integer'}), 400
        
        if 'keyword' in data:
            if not isinstance(data['keyword'], bool):
                return jsonify({'error': 'keyword must be a boolean'}), 400
            request_body['keyword'] = data['keyword']
        
        if 'highlight' in data:
            if not isinstance(data['highlight'], bool):
                return jsonify({'error': 'highlight must be a boolean'}), 400
            request_body['highlight'] = data['highlight']
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/retrieval',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=60  # Longer timeout for retrieval operations
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'chunks': response_data.get('data', {}).get('chunks', []),
                'total': response_data.get('data', {}).get('total', 0)
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to retrieve chunks')
            return jsonify({
                'success': False,
                'error': error_message,
                'code': response_data.get('code', -1)
            }), response.status_code if response.status_code != 200 else 400
            
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'An error occurred: {str(e)}'}), 500


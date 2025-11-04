from flask import Blueprint, request, jsonify, Response
from utils import admin_or_instructor_required, get_current_user
from config import Config
import requests

ragflow_documents_bp = Blueprint('ragflow_documents', __name__)

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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents', methods=['POST'])
@admin_or_instructor_required
def upload_documents(dataset_id):
    """Upload documents to a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Check if files are in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part!'}), 400
        
        files = request.files.getlist('file')
        if not files or all(f.filename == '' for f in files):
            return jsonify({'error': 'No files selected'}), 400
        
        # Prepare files for RAGFlow API
        files_to_send = []
        for file in files:
            if file.filename:
                file.seek(0)  # Reset file pointer
                files_to_send.append(('file', (file.filename, file.read(), file.content_type or 'application/octet-stream')))
        
        if not files_to_send:
            return jsonify({'error': 'No valid files to upload'}), 400
        
        # Prepare headers (no Content-Type for multipart, requests will set it)
        headers = {
            'Authorization': f'Bearer {api_key_to_use}'
        }
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents',
            files=files_to_send,
            headers=headers,
            timeout=120  # Longer timeout for file uploads
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'documents': response_data.get('data', [])
            }), 201
        else:
            error_message = response_data.get('message', 'Failed to upload documents')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents', methods=['GET'])
@admin_or_instructor_required
def list_documents(dataset_id):
    """List documents in a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '30')
        orderby = request.args.get('orderby', 'create_time')
        desc = request.args.get('desc', 'true')
        keywords = request.args.get('keywords')
        document_id = request.args.get('id')
        document_name = request.args.get('name')
        create_time_from = request.args.get('create_time_from', '0')
        create_time_to = request.args.get('create_time_to', '0')
        
        # Build query string
        params = {
            'page': page,
            'page_size': page_size,
            'orderby': orderby,
            'desc': desc,
            'create_time_from': create_time_from,
            'create_time_to': create_time_to
        }
        if keywords:
            params['keywords'] = keywords
        if document_id:
            params['id'] = document_id
        if document_name:
            params['name'] = document_name
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents',
            headers=get_ragflow_headers(api_key_to_use),
            params=params,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'documents': response_data.get('data', {}).get('docs', []),
                'total': response_data.get('data', {}).get('total', 0)
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch documents')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents/<document_id>', methods=['GET'])
@admin_or_instructor_required
def download_document(dataset_id, document_id):
    """Download a document from a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents/{document_id}',
            headers={'Authorization': f'Bearer {api_key_to_use}'},
            timeout=120,
            stream=True
        )
        
        # Check if response is JSON error
        content_type = response.headers.get('content-type', '')
        if 'application/json' in content_type:
            response_data = response.json()
            if response_data.get('code') != 0:
                error_message = response_data.get('message', 'Failed to download document')
                return jsonify({
                    'error': error_message,
                    'code': response_data.get('code', -1)
                }), response.status_code if response.status_code != 200 else 400
        
        # Return file content
        return Response(
            response.iter_content(chunk_size=8192),
            mimetype=response.headers.get('content-type', 'application/octet-stream'),
            headers={
                'Content-Disposition': response.headers.get('Content-Disposition', f'attachment')
            }
        )
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents/<document_id>', methods=['PUT'])
@admin_or_instructor_required
def update_document(dataset_id, document_id):
    """Update a document in a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Prepare request body
        request_body = {}
        
        if 'name' in data:
            request_body['name'] = data['name']
        
        if 'meta_fields' in data:
            request_body['meta_fields'] = data['meta_fields']
        
        if 'chunk_method' in data:
            if data['chunk_method']:
                valid_chunk_methods = ['naive', 'manual', 'qa', 'table', 'paper', 'book', 
                                       'laws', 'presentation', 'picture', 'one', 'email']
                if data['chunk_method'] not in valid_chunk_methods:
                    return jsonify({'error': f'Invalid chunk_method. Must be one of: {", ".join(valid_chunk_methods)}'}), 400
            request_body['chunk_method'] = data.get('chunk_method')
        
        # Handle parser_config based on chunk_method
        chunk_method = request_body.get('chunk_method') or data.get('chunk_method')
        if 'parser_config' in data and data['parser_config']:
            parser_config = data['parser_config']
            
            if chunk_method == 'naive':
                # Validate naive parser_config
                if 'chunk_token_num' in parser_config:
                    val = parser_config['chunk_token_num']
                    try:
                        val = int(val)
                        if val < 1:
                            return jsonify({'error': 'chunk_token_num must be >= 1'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'chunk_token_num must be an integer'}), 400
                
                if 'task_page_size' in parser_config:
                    val = parser_config['task_page_size']
                    try:
                        val = int(val)
                        if val < 1:
                            return jsonify({'error': 'task_page_size must be >= 1'}), 400
                    except (ValueError, TypeError):
                        return jsonify({'error': 'task_page_size must be an integer'}), 400
            
            request_body['parser_config'] = parser_config
        
        # Make request to RAGFlow
        response = requests.put(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents/{document_id}',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Document updated successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to update document')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents', methods=['DELETE'])
@admin_or_instructor_required
def delete_documents(dataset_id):
    """Delete documents from a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # ids is optional - if not provided, all documents will be deleted
        ids = data.get('ids')
        
        # If ids is provided, validate it's a list
        if ids is not None:
            if not isinstance(ids, list):
                return jsonify({'error': 'ids must be a list of strings'}), 400
            for doc_id in ids:
                if not isinstance(doc_id, str):
                    return jsonify({'error': 'All document IDs must be strings'}), 400
        
        request_body = {}
        if ids is not None:
            request_body['ids'] = ids
        
        # Make request to RAGFlow
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Document(s) deleted successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to delete documents')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/chunks', methods=['POST'])
@admin_or_instructor_required
def parse_documents(dataset_id):
    """Parse documents in a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate document_ids
        if 'document_ids' not in data:
            return jsonify({'error': 'document_ids is required'}), 400
        
        document_ids = data.get('document_ids')
        
        if not isinstance(document_ids, list):
            return jsonify({'error': 'document_ids must be a list of strings'}), 400
        
        if len(document_ids) == 0:
            return jsonify({'error': 'document_ids cannot be empty'}), 400
        
        for doc_id in document_ids:
            if not isinstance(doc_id, str):
                return jsonify({'error': 'All document IDs must be strings'}), 400
        
        request_body = {
            'document_ids': document_ids
        }
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/chunks',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=120  # Longer timeout for parsing
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Documents parsing started successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to start parsing documents')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/chunks', methods=['DELETE'])
@admin_or_instructor_required
def stop_parsing_documents(dataset_id):
    """Stop parsing documents in a dataset"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate document_ids
        if 'document_ids' not in data:
            return jsonify({'error': 'document_ids is required'}), 400
        
        document_ids = data.get('document_ids')
        
        if not isinstance(document_ids, list):
            return jsonify({'error': 'document_ids must be a list of strings'}), 400
        
        if len(document_ids) == 0:
            return jsonify({'error': 'document_ids cannot be empty'}), 400
        
        for doc_id in document_ids:
            if not isinstance(doc_id, str):
                return jsonify({'error': 'All document IDs must be strings'}), 400
        
        request_body = {
            'document_ids': document_ids
        }
        
        # Make request to RAGFlow
        response = requests.delete(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/chunks',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Document parsing stopped successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to stop parsing documents')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents/<document_id>/chunks', methods=['POST'])
@admin_or_instructor_required
def add_chunk(dataset_id, document_id):
    """Add a chunk to a document"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Validate content
        if 'content' not in data or not data.get('content'):
            return jsonify({'error': 'content is required'}), 400
        
        # Prepare request body
        request_body = {
            'content': data['content']
        }
        
        # Add optional fields
        if 'important_keywords' in data:
            if isinstance(data['important_keywords'], list):
                request_body['important_keywords'] = data['important_keywords']
            else:
                return jsonify({'error': 'important_keywords must be a list'}), 400
        
        if 'questions' in data:
            if isinstance(data['questions'], list):
                request_body['questions'] = data['questions']
            else:
                return jsonify({'error': 'questions must be a list'}), 400
        
        # Make request to RAGFlow
        response = requests.post(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents/{document_id}/chunks',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'chunk': response_data.get('data', {}).get('chunk', {})
            }), 201
        else:
            error_message = response_data.get('message', 'Failed to add chunk')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents/<document_id>/chunks/<chunk_id>', methods=['PUT'])
@admin_or_instructor_required
def update_chunk(dataset_id, document_id, chunk_id):
    """Update a chunk in a document"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        data = request.get_json() or {}
        
        # Prepare request body
        request_body = {}
        
        if 'content' in data:
            request_body['content'] = data['content']
        
        if 'important_keywords' in data:
            if isinstance(data['important_keywords'], list):
                request_body['important_keywords'] = data['important_keywords']
            else:
                return jsonify({'error': 'important_keywords must be a list'}), 400
        
        if 'available' in data:
            if isinstance(data['available'], bool):
                request_body['available'] = data['available']
            else:
                return jsonify({'error': 'available must be a boolean'}), 400
        
        # Make request to RAGFlow
        response = requests.put(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents/{document_id}/chunks/{chunk_id}',
            json=request_body,
            headers=get_ragflow_headers(api_key_to_use),
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            return jsonify({
                'success': True,
                'message': 'Chunk updated successfully'
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to update chunk')
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

@ragflow_documents_bp.route('/datasets/<dataset_id>/documents/<document_id>/chunks', methods=['GET'])
@admin_or_instructor_required
def list_chunks(dataset_id, document_id):
    """List chunks in a document"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Get query parameters
        page = request.args.get('page', '1')
        page_size = request.args.get('page_size', '1024')
        keywords = request.args.get('keywords')
        chunk_id = request.args.get('id')
        
        # Build query string
        params = {
            'page': page,
            'page_size': page_size
        }
        if keywords:
            params['keywords'] = keywords
        if chunk_id:
            params['id'] = chunk_id
        
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/datasets/{dataset_id}/documents/{document_id}/chunks',
            headers=get_ragflow_headers(api_key_to_use),
            params=params,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('code') == 0:
            chunks_data = response_data.get('data', {}).get('chunks', [])
            # Process chunks to handle image_id properly
            for chunk in chunks_data:
                if chunk.get('image_id'):
                    # Keep image_id as is for frontend to use
                    pass
            return jsonify({
                'success': True,
                'chunks': chunks_data,
                'document': response_data.get('data', {}).get('doc', {}),
                'total': response_data.get('data', {}).get('total', 0)
            }), 200
        else:
            error_message = response_data.get('message', 'Failed to fetch chunks')
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

@ragflow_documents_bp.route('/v1/document/image/<image_id>', methods=['GET'])
@admin_or_instructor_required
def get_chunk_image(image_id):
    """Get image for a chunk using RAGFlow's image endpoint"""
    try:
        current_user = get_current_user()
        api_key_to_use = get_api_key_for_user(current_user)
        
        # Make request to RAGFlow to get the image using the correct endpoint
        # RAGFlow uses /v1/document/image/ without /api prefix
        ragflow_url = f'{RAGFLOW_BASE_URL}/v1/document/image/{image_id}'
        print(f"\n[get_chunk_image] Requesting image from RAGFlow: {ragflow_url}")
        print(f"[get_chunk_image] Image ID: {image_id}")
        print(f"[get_chunk_image] RAGFLOW_BASE_URL: {RAGFLOW_BASE_URL}")
        
        # Try with authentication first
        headers = {'Authorization': f'Bearer {api_key_to_use}'}
        response = requests.get(
            ragflow_url,
            headers=headers,
            timeout=30,
            stream=True,
            allow_redirects=True
        )
        
        # If 401 or 403, try without auth (some RAGFlow image endpoints might be public)
        if response.status_code in [401, 403]:
            print(f"[get_chunk_image] Got {response.status_code}, trying without auth...")
            response = requests.get(
                ragflow_url,
                timeout=30,
                stream=True,
                allow_redirects=True
            )
        
        print(f"[get_chunk_image] RAGFlow response status: {response.status_code}")
        print(f"[get_chunk_image] RAGFlow response content-type: {response.headers.get('content-type', 'unknown')}")
        
        # Check if response is JSON error
        content_type = response.headers.get('content-type', '')
        if 'application/json' in content_type:
            try:
                response_data = response.json()
                print(f"[get_chunk_image] RAGFlow JSON response: {response_data}")
                if response_data.get('code') != 0:
                    error_message = response_data.get('message', 'Failed to fetch image')
                    return jsonify({
                        'error': error_message,
                        'code': response_data.get('code', -1),
                        'details': f'RAGFlow returned error code {response_data.get("code")}'
                    }), response.status_code if response.status_code != 200 else 400
            except Exception as json_error:
                print(f"[get_chunk_image] Error parsing JSON response: {json_error}")
                return jsonify({
                    'error': 'Failed to parse RAGFlow response',
                    'status_code': response.status_code,
                    'content_type': content_type
                }), 400
        
        # Check if response is successful
        if response.status_code != 200:
            return jsonify({
                'error': f'RAGFlow returned status {response.status_code}',
                'status_code': response.status_code
            }), response.status_code
        
        # Return image content with proper headers
        mimetype = response.headers.get('content-type', 'image/png')
        print(f"[get_chunk_image] Returning image with mimetype: {mimetype}")
        
        return Response(
            response.iter_content(chunk_size=8192),
            mimetype=mimetype,
            headers={
                'Content-Disposition': response.headers.get('Content-Disposition', 'inline'),
                'Cache-Control': 'public, max-age=3600'
            }
        )
            
    except ValueError as e:
        print(f"[get_chunk_image] ValueError: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except requests.exceptions.RequestException as e:
        print(f"[get_chunk_image] RequestException: {str(e)}")
        return jsonify({'error': f'Failed to connect to RAGFlow: {str(e)}'}), 500
    except Exception as e:
        import traceback
        print(f"[get_chunk_image] Exception: {str(e)}")
        print(f"[get_chunk_image] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


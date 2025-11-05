from flask import Blueprint, request, jsonify
from utils import admin_required, admin_or_instructor_required, student_required, get_current_user
from models import db, Student, StudentGroup
from sqlalchemy import text
import requests

chat_assignments_bp = Blueprint('chat_assignments', __name__)

@chat_assignments_bp.route('/chats/<chat_id>/assign-students', methods=['POST'])
@admin_or_instructor_required
def assign_chat_to_students(chat_id):
    """Assign a chat to one or more students"""
    try:
        current_user = get_current_user()
        data = request.get_json() or {}
        
        if 'student_ids' not in data:
            return jsonify({'error': 'student_ids is required'}), 400
        
        student_ids = data.get('student_ids')
        
        if not isinstance(student_ids, list):
            return jsonify({'error': 'student_ids must be a list'}), 400
        
        # Get instructor ID if current user is an instructor
        instructor_id = None
        if current_user.role == 'instructor' and current_user.instructor:
            instructor_id = current_user.instructor.id
        # Admin can also assign, but we don't track admin_id
        
        # Validate all students exist
        if len(student_ids) > 0:
            students = Student.query.filter(Student.id.in_(student_ids)).all()
            if len(students) != len(student_ids):
                return jsonify({'error': 'One or more student IDs are invalid'}), 400
        
        # Remove existing assignments for this chat
        db.session.execute(
            text('DELETE FROM chat_student_association WHERE chat_id = :chat_id'),
            {'chat_id': chat_id}
        )
        
        # Add new assignments
        for student_id in student_ids:
            db.session.execute(
                text('''
                    INSERT INTO chat_student_association (chat_id, student_id, instructor_id, assigned_at)
                    VALUES (:chat_id, :student_id, :instructor_id, NOW())
                    ON DUPLICATE KEY UPDATE assigned_at = NOW(), instructor_id = :instructor_id
                '''),
                {'chat_id': chat_id, 'student_id': student_id, 'instructor_id': instructor_id}
            )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Chat assigned to {len(student_ids)} student(s) successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to assign chat: {str(e)}'}), 500

@chat_assignments_bp.route('/chats/<chat_id>/assign-groups', methods=['POST'])
@admin_or_instructor_required
def assign_chat_to_groups(chat_id):
    """Assign a chat to one or more student groups"""
    try:
        current_user = get_current_user()
        data = request.get_json() or {}
        
        if 'group_ids' not in data:
            return jsonify({'error': 'group_ids is required'}), 400
        
        group_ids = data.get('group_ids')
        
        if not isinstance(group_ids, list):
            return jsonify({'error': 'group_ids must be a list'}), 400
        
        # Get instructor ID if current user is an instructor
        instructor_id = None
        if current_user.role == 'instructor' and current_user.instructor:
            instructor_id = current_user.instructor.id
        
        # Validate all groups exist
        if len(group_ids) > 0:
            groups = StudentGroup.query.filter(StudentGroup.id.in_(group_ids)).all()
            if len(groups) != len(group_ids):
                return jsonify({'error': 'One or more group IDs are invalid'}), 400
        
        # Remove existing assignments for this chat
        db.session.execute(
            text('DELETE FROM chat_student_group_association WHERE chat_id = :chat_id'),
            {'chat_id': chat_id}
        )
        
        # Add new assignments
        for group_id in group_ids:
            db.session.execute(
                text('''
                    INSERT INTO chat_student_group_association (chat_id, student_group_id, instructor_id, assigned_at)
                    VALUES (:chat_id, :group_id, :instructor_id, NOW())
                    ON DUPLICATE KEY UPDATE assigned_at = NOW(), instructor_id = :instructor_id
                '''),
                {'chat_id': chat_id, 'group_id': group_id, 'instructor_id': instructor_id}
            )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Chat assigned to {len(group_ids)} group(s) successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to assign chat: {str(e)}'}), 500

@chat_assignments_bp.route('/chats/<chat_id>/students', methods=['GET'])
@admin_or_instructor_required
def get_chat_assignments(chat_id):
    """Get all students and groups assigned to a chat"""
    try:
        # Get directly assigned students
        result = db.session.execute(
            text('''
                SELECT s.id, s.first_name, s.last_name, s.student_id, u.email, csa.assigned_at
                FROM student s
                INNER JOIN user u ON s.user_id = u.id
                INNER JOIN chat_student_association csa ON s.id = csa.student_id
                WHERE csa.chat_id = :chat_id
            '''),
            {'chat_id': chat_id}
        )
        direct_students = [dict(row._mapping) for row in result]
        
        # Get students through groups
        result = db.session.execute(
            text('''
                SELECT DISTINCT s.id, s.first_name, s.last_name, s.student_id, u.email, cga.assigned_at
                FROM student s
                INNER JOIN user u ON s.user_id = u.id
                INNER JOIN student_group_association sga ON s.id = sga.student_id
                INNER JOIN chat_student_group_association cga ON sga.group_id = cga.student_group_id
                WHERE cga.chat_id = :chat_id
            '''),
            {'chat_id': chat_id}
        )
        group_students = [dict(row._mapping) for row in result]
        
        # Get assigned groups
        result = db.session.execute(
            text('''
                SELECT sg.id, sg.name, sg.description, cga.assigned_at
                FROM student_group sg
                INNER JOIN chat_student_group_association cga ON sg.id = cga.student_group_id
                WHERE cga.chat_id = :chat_id
            '''),
            {'chat_id': chat_id}
        )
        assigned_groups = [dict(row._mapping) for row in result]
        
        return jsonify({
            'success': True,
            'direct_students': direct_students,
            'group_students': group_students,
            'assigned_groups': assigned_groups
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get assignments: {str(e)}'}), 500

@chat_assignments_bp.route('/chats/<chat_id>/students/<int:student_id>', methods=['DELETE'])
@admin_or_instructor_required
def unassign_chat_from_student(chat_id, student_id):
    """Unassign a chat from a student"""
    try:
        db.session.execute(
            text('DELETE FROM chat_student_association WHERE chat_id = :chat_id AND student_id = :student_id'),
            {'chat_id': chat_id, 'student_id': student_id}
        )
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Chat unassigned from student successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to unassign chat: {str(e)}'}), 500

@chat_assignments_bp.route('/chats/<chat_id>/groups/<int:group_id>', methods=['DELETE'])
@admin_or_instructor_required
def unassign_chat_from_group(chat_id, group_id):
    """Unassign a chat from a student group"""
    try:
        db.session.execute(
            text('DELETE FROM chat_student_group_association WHERE chat_id = :chat_id AND student_group_id = :group_id'),
            {'chat_id': chat_id, 'group_id': group_id}
        )
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Chat unassigned from group successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to unassign chat: {str(e)}'}), 500

@chat_assignments_bp.route('/student/assigned-chats', methods=['GET'])
@student_required
def get_student_assigned_chats():
    """Get all chats assigned to the current student"""
    try:
        current_user = get_current_user()
        
        if not current_user.student:
            return jsonify({'error': 'Student profile not found'}), 404
        
        student_id = current_user.student.id
        
        # Get directly assigned chats with instructor_id
        result = db.session.execute(
            text('''
                SELECT DISTINCT csa.chat_id, csa.instructor_id
                FROM chat_student_association csa
                WHERE csa.student_id = :student_id
            '''),
            {'student_id': student_id}
        )
        direct_assignments = [(row[0], row[1]) for row in result]
        direct_chat_ids = [row[0] for row in direct_assignments]
        
        # Get chats assigned through groups with instructor_id
        result = db.session.execute(
            text('''
                SELECT DISTINCT cga.chat_id, cga.instructor_id
                FROM chat_student_group_association cga
                INNER JOIN student_group_association sga ON cga.student_group_id = sga.group_id
                WHERE sga.student_id = :student_id
            '''),
            {'student_id': student_id}
        )
        group_assignments = [(row[0], row[1]) for row in result]
        group_chat_ids = [row[0] for row in group_assignments]
        
        # Combine and deduplicate, keeping track of instructor_id for each chat
        chat_instructor_map = {}
        for chat_id, instructor_id in direct_assignments + group_assignments:
            if chat_id not in chat_instructor_map:
                chat_instructor_map[chat_id] = instructor_id
        
        all_chat_ids = list(set(direct_chat_ids + group_chat_ids))
        
        # Fetch chat details from RAGFlow if we have chat IDs
        chats = []
        if all_chat_ids:
            try:
                # Determine which API key to use for each chat
                # Priority: 1. Instructor's API key (if chat was assigned by instructor), 2. Global API key
                api_key_to_use = Config.RAGFLOW_API_KEY
                
                # Try to get instructor's API key for the first chat
                # If multiple chats have different instructors, we'll use the first one's key
                # In practice, students will typically access chats assigned by the same instructor
                instructor_id = None
                for chat_id in all_chat_ids:
                    if chat_id in chat_instructor_map and chat_instructor_map[chat_id]:
                        instructor_id = chat_instructor_map[chat_id]
                        break
                
                if instructor_id:
                    instructor = Instructor.query.get(instructor_id)
                    if instructor and instructor.ragflow_api_key:
                        api_key_to_use = instructor.ragflow_api_key
                        print(f"[get_student_assigned_chats] Using instructor {instructor_id}'s API key")
                
                if api_key_to_use:
                    # Try fetching all chats first
                    response = requests.get(
                        f'{Config.RAGFLOW_BASE_URL}/api/v1/chats',
                        headers=get_ragflow_headers(api_key_to_use),
                        params={'page_size': 1000},
                        timeout=10
                    )
                    print(f"[get_student_assigned_chats] RAGFlow response status: {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        print(f"[get_student_assigned_chats] RAGFlow response data keys: {data.keys() if isinstance(data, dict) else 'not a dict'}")
                        if data.get('code') == 0 and data.get('data'):
                            all_chats = data.get('data', [])
                            print(f"[get_student_assigned_chats] Found {len(all_chat_ids)} assigned chat IDs: {all_chat_ids}")
                            print(f"[get_student_assigned_chats] Found {len(all_chats)} total chats from RAGFlow")
                            # Filter to only assigned chats
                            chats = [chat for chat in all_chats if chat.get('id') in all_chat_ids]
                            print(f"[get_student_assigned_chats] Filtered to {len(chats)} matching chats")
                            
                            # Find chats that don't exist (in assignments but not in RAGFlow)
                            found_chat_ids = {chat.get('id') for chat in chats}
                            unavailable_chat_ids = [chat_id for chat_id in all_chat_ids if chat_id not in found_chat_ids]
                            
                            # If we didn't find all chats, try fetching by ID individually
                            if len(chats) < len(all_chat_ids):
                                missing_ids = [cid for cid in all_chat_ids if cid not in [c.get('id') for c in chats]]
                                print(f"[get_student_assigned_chats] Missing {len(missing_ids)} chats, trying to fetch individually: {missing_ids}")
                                for chat_id in missing_ids:
                                    try:
                                        individual_response = requests.get(
                                            f'{Config.RAGFLOW_BASE_URL}/api/v1/chats',
                                            headers=get_ragflow_headers(api_key_to_use),
                                            params={'id': chat_id},
                                            timeout=10
                                        )
                                        if individual_response.status_code == 200:
                                            individual_data = individual_response.json()
                                            if individual_data.get('code') == 0 and individual_data.get('data'):
                                                individual_chats = individual_data.get('data', [])
                                                if individual_chats:
                                                    chats.extend(individual_chats)
                                                    found_chat_ids.add(chat_id)
                                                    # Remove from unavailable if found
                                                    if chat_id in unavailable_chat_ids:
                                                        unavailable_chat_ids.remove(chat_id)
                                                    print(f"[get_student_assigned_chats] Found chat {chat_id} individually")
                                    except Exception as e:
                                        print(f"[get_student_assigned_chats] Error fetching chat {chat_id} individually: {e}")
                                        # Chat is definitely unavailable if individual fetch also fails
                                        if chat_id not in unavailable_chat_ids:
                                            unavailable_chat_ids.append(chat_id)
                        else:
                            print(f"[get_student_assigned_chats] RAGFlow returned error: code={data.get('code')}, message={data.get('message')}")
                    else:
                        print(f"[get_student_assigned_chats] RAGFlow request failed with status {response.status_code}: {response.text[:200]}")
                else:
                    print("[get_student_assigned_chats] No RAGFlow API key configured")
            except Exception as e:
                import traceback
                print(f"[get_student_assigned_chats] Error fetching chat details: {e}")
                print(f"[get_student_assigned_chats] Traceback: {traceback.format_exc()}")
                pass
        
        # Determine unavailable chat IDs (those in assignments but not found)
        unavailable_chat_ids = []
        if 'unavailable_chat_ids' not in locals():
            found_chat_ids = {chat.get('id') for chat in chats}
            unavailable_chat_ids = [chat_id for chat_id in all_chat_ids if chat_id not in found_chat_ids]
        
        return jsonify({
            'success': True,
            'chat_ids': all_chat_ids,
            'chats': chats,
            'unavailable_chat_ids': unavailable_chat_ids
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get assigned chats: {str(e)}'}), 500


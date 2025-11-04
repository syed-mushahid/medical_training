from flask import Blueprint, request, jsonify
from models import db, StudentGroup, Student, Instructor, User
from utils import admin_or_instructor_required, get_current_user, get_current_instructor
from flask_jwt_extended import get_jwt_identity

student_groups_bp = Blueprint('student_groups', __name__)

def can_manage_group(group, current_user):
    """Check if current user can manage this group"""
    if current_user.role == 'admin':
        return True
    
    if current_user.role == 'instructor' and current_user.instructor:
        instructor = current_user.instructor
        # Can manage if: created by them OR they are assigned to the group
        is_creator = group.created_by_instructor_id == instructor.id
        is_assigned = instructor.id in [inst.id for inst in group.instructors]
        return is_creator or is_assigned
    
    return False

@student_groups_bp.route('', methods=['GET'])
@admin_or_instructor_required
def get_student_groups():
    try:
        print(f"\n[get_student_groups] Fetching student groups...")
        current_user = get_current_user()
        
        if current_user.role == 'admin':
            # Admin sees all groups
            groups = StudentGroup.query.all()
        elif current_user.role == 'instructor' and current_user.instructor:
            # Instructor sees only groups they created or are assigned to
            instructor = current_user.instructor
            # Get groups created by this instructor
            created_groups = StudentGroup.query.filter_by(created_by_instructor_id=instructor.id).all()
            # Get groups where this instructor is assigned
            assigned_groups = StudentGroup.query.filter(StudentGroup.instructors.contains(instructor)).all()
            # Combine and deduplicate
            groups = list(set(created_groups + assigned_groups))
        else:
            groups = []
        
        print(f"[get_student_groups] Found {len(groups)} groups for user {current_user.email}")
        return jsonify({
            'groups': [group.to_dict(include_students=True, include_instructors=True) for group in groups]
        }), 200
    except Exception as e:
        print(f"\n[get_student_groups] ERROR: {str(e)}")
        import traceback
        print(f"[get_student_groups] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fetch student groups: {str(e)}'}), 500

@student_groups_bp.route('', methods=['POST'])
@admin_or_instructor_required
def create_student_group():
    try:
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({'error': 'Group name is required'}), 400
        
        current_user = get_current_user()
        current_instructor = get_current_instructor()
        
        group = StudentGroup(
            name=data['name'],
            description=data.get('description')
        )
        
        # Set creator if current user is an instructor
        if current_instructor:
            group.created_by_instructor_id = current_instructor.id
        
        db.session.add(group)
        db.session.flush()
        
        # Assign students if provided
        if data.get('student_ids'):
            students = Student.query.filter(Student.id.in_(data['student_ids'])).all()
            group.students = students
        
        # Assign instructors if provided
        if data.get('instructor_ids'):
            instructors = Instructor.query.filter(Instructor.id.in_(data['instructor_ids'])).all()
            group.instructors = instructors
        elif current_instructor:
            # If no instructors specified and current user is instructor, add them automatically
            group.instructors = [current_instructor]
        
        db.session.commit()
        
        print(f"[create_student_group] Created group {group.id} by {current_user.email}")
        return jsonify({
            'group': group.to_dict(include_students=True, include_instructors=True)
        }), 201
    except Exception as e:
        print(f"\n[create_student_group] ERROR: {str(e)}")
        import traceback
        print(f"[create_student_group] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to create student group: {str(e)}'}), 500

@student_groups_bp.route('/<int:group_id>', methods=['GET'])
@admin_or_instructor_required
def get_student_group(group_id):
    try:
        group = StudentGroup.query.get_or_404(group_id)
        current_user = get_current_user()
        
        # Check if user can view this group
        if not can_manage_group(group, current_user):
            return jsonify({'error': 'You do not have permission to view this group'}), 403
        
        return jsonify({
            'group': group.to_dict(include_students=True, include_instructors=True)
        }), 200
    except Exception as e:
        print(f"\n[get_student_group] ERROR: {str(e)}")
        import traceback
        print(f"[get_student_group] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fetch student group: {str(e)}'}), 500

@student_groups_bp.route('/<int:group_id>', methods=['PUT'])
@admin_or_instructor_required
def update_student_group(group_id):
    try:
        group = StudentGroup.query.get_or_404(group_id)
        current_user = get_current_user()
        
        # Check if user can manage this group
        if not can_manage_group(group, current_user):
            return jsonify({'error': 'You do not have permission to update this group'}), 403
        
        data = request.get_json()
        
        if data.get('name'):
            group.name = data['name']
        if data.get('description') is not None:
            group.description = data['description']
        
        # Update students if provided
        if 'student_ids' in data:
            students = Student.query.filter(Student.id.in_(data['student_ids'])).all()
            group.students = students
        
        # Update instructors if provided
        if 'instructor_ids' in data:
            instructors = Instructor.query.filter(Instructor.id.in_(data['instructor_ids'])).all()
            group.instructors = instructors
        
        db.session.commit()
        
        print(f"[update_student_group] Updated group {group_id} by {current_user.email}")
        return jsonify({
            'group': group.to_dict(include_students=True, include_instructors=True)
        }), 200
    except Exception as e:
        print(f"\n[update_student_group] ERROR: {str(e)}")
        import traceback
        print(f"[update_student_group] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to update student group: {str(e)}'}), 500

@student_groups_bp.route('/<int:group_id>', methods=['DELETE'])
@admin_or_instructor_required
def delete_student_group(group_id):
    try:
        group = StudentGroup.query.get_or_404(group_id)
        current_user = get_current_user()
        
        # Check if user can manage this group
        if not can_manage_group(group, current_user):
            return jsonify({'error': 'You do not have permission to delete this group'}), 403
        
        db.session.delete(group)
        db.session.commit()
        
        print(f"[delete_student_group] Deleted group {group_id} by {current_user.email}")
        return jsonify({'message': 'Student group deleted successfully'}), 200
    except Exception as e:
        print(f"\n[delete_student_group] ERROR: {str(e)}")
        import traceback
        print(f"[delete_student_group] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to delete student group: {str(e)}'}), 500


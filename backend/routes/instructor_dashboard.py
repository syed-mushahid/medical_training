from flask import Blueprint, jsonify
from utils import admin_or_instructor_required, get_current_user
from models import db, Instructor, Student, StudentGroup
from sqlalchemy import text
from datetime import datetime, timedelta

instructor_dashboard_bp = Blueprint('instructor_dashboard', __name__)

@instructor_dashboard_bp.route('/instructor/dashboard/stats', methods=['GET', 'OPTIONS'])
@admin_or_instructor_required
def get_instructor_dashboard_stats():
    """Get dashboard statistics for instructor"""
    try:
        current_user = get_current_user()
        
        # Only instructors can access this endpoint
        if current_user.role != 'instructor':
            return jsonify({'error': 'This endpoint is only for instructors'}), 403
        
        if not current_user.instructor:
            return jsonify({'error': 'Instructor profile not found'}), 404
        
        instructor = current_user.instructor
        instructor_id = instructor.id
        
        # Get groups managed by this instructor
        groups = instructor.groups
        group_ids = [group.id for group in groups]
        
        # Total groups
        total_groups = len(groups)
        
        # Total students in instructor's groups
        total_students = 0
        students_in_groups = set()
        for group in groups:
            for student in group.students:
                if student.id not in students_in_groups:
                    students_in_groups.add(student.id)
                    total_students += 1
        
        # Get chat assignments for this instructor's groups
        # Check chat_student_group_association table
        total_assigned_chats = 0
        assigned_chat_ids = []
        
        if group_ids:
            try:
                # Use tuple for IN clause (works with MySQL)
                group_ids_tuple = tuple(group_ids)
                chat_assignments_query = text("""
                    SELECT DISTINCT chat_id 
                    FROM chat_student_group_association 
                    WHERE student_group_id IN :group_ids
                """)
                result = db.session.execute(chat_assignments_query, {'group_ids': group_ids_tuple})
                assigned_chat_ids = [row[0] for row in result]
            except Exception as e:
                print(f"Error fetching group chat assignments: {e}")
                import traceback
                print(traceback.format_exc())
                assigned_chat_ids = []
        
        # Get direct student assignments for chats
        direct_chat_ids = []
        if students_in_groups:
            try:
                student_list = list(students_in_groups)
                student_ids_tuple = tuple(student_list)
                direct_student_assignments_query = text("""
                    SELECT DISTINCT chat_id 
                    FROM chat_student_association 
                    WHERE student_id IN :student_ids
                """)
                result = db.session.execute(direct_student_assignments_query, {'student_ids': student_ids_tuple})
                direct_chat_ids = [row[0] for row in result]
            except Exception as e:
                print(f"Error fetching direct student chat assignments: {e}")
                import traceback
                print(traceback.format_exc())
                direct_chat_ids = []
        
        # Combine and get unique chat IDs
        all_chat_ids = list(set(assigned_chat_ids + direct_chat_ids))
        total_assigned_chats = len(all_chat_ids)
        
        # Get total sessions (we'll need to query RAGFlow or store locally)
        # For now, we'll estimate based on available data
        # This would require additional API calls to RAGFlow or a local sessions table
        
        # Recent activity (groups created in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_groups = StudentGroup.query.filter(
            StudentGroup.created_by_instructor_id == instructor_id,
            StudentGroup.created_at >= thirty_days_ago
        ).count()
        
        # Groups created by this instructor
        groups_created = StudentGroup.query.filter(
            StudentGroup.created_by_instructor_id == instructor_id
        ).count()
        
        # Calculate average students per group
        avg_students_per_group = total_students / total_groups if total_groups > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_groups': total_groups,
                'total_students': total_students,
                'total_assigned_chats': total_assigned_chats,
                'groups_created': groups_created,
                'recent_groups': recent_groups,
                'avg_students_per_group': round(avg_students_per_group, 1),
                'group_ids': group_ids,
                'student_ids': list(students_in_groups)
            }
        }), 200
        
    except Exception as e:
        import traceback
        print(f"[get_instructor_dashboard_stats] ERROR: {str(e)}")
        print(f"[get_instructor_dashboard_stats] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fetch dashboard stats: {str(e)}'}), 500


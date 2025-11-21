"""
Migration script to add created_by_instructor_id column to student_group table
Run this once to update your database schema
"""
from models import db
from sqlalchemy import text

def run_migration():
    """Run the migration to add created_by_instructor_id column."""
    try:
        # Check if column already exists
        result = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'student_group' "
            "AND COLUMN_NAME = 'created_by_instructor_id'"
        ))
        
        if result.scalar() == 0:
            print("[Migration] Adding created_by_instructor_id column to student_group table...")
            db.session.execute(text(
                "ALTER TABLE student_group "
                "ADD COLUMN created_by_instructor_id INT NULL, "
                "ADD CONSTRAINT fk_created_by_instructor "
                "FOREIGN KEY (created_by_instructor_id) REFERENCES instructor(id) "
                "ON DELETE SET NULL"
            ))
            db.session.commit()
            print("[Migration] Column added successfully!")
            return True
        else:
            print("[Migration] Column already exists, skipping migration.")
            return True
    except Exception as e:
        print(f"[Migration] Error during migration: {str(e)}")
        db.session.rollback()
        print("[Migration] Migration failed. Please run this manually in MySQL:")
        print("ALTER TABLE student_group ADD COLUMN created_by_instructor_id INT NULL;")
        print("ALTER TABLE student_group ADD CONSTRAINT fk_created_by_instructor FOREIGN KEY (created_by_instructor_id) REFERENCES instructor(id) ON DELETE SET NULL;")
        return False

# Allow running as standalone script
if __name__ == '__main__':
    from app import create_app
    app = create_app()
    with app.app_context():
        success = run_migration()
        exit(0 if success else 1)


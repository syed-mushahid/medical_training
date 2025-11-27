import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import BadRequest
from config import Config
from models import db
from routes.auth import auth_bp
from routes.instructors import instructors_bp
from routes.students import students_bp
from routes.student_groups import student_groups_bp
from routes.ragflow import ragflow_bp
from routes.ragflow_documents import ragflow_documents_bp
from routes.ragflow_chats import ragflow_chats_bp
from routes.ragflow_sessions import ragflow_sessions_bp
from routes.ragflow_completions import ragflow_completions_bp
from routes.chat_assignments import chat_assignments_bp
from routes.evaluations import evaluations_bp
from routes.student_profile import student_profile_bp
from routes.instructor_profile import instructor_profile_bp
from routes.admin_profile import admin_profile_bp
from seed import seed_admin

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"\n[JWT] Token expired - Header: {jwt_header}, Payload: {jwt_payload}")
        return jsonify({'error': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"\n[JWT] Invalid token error: {str(error)}")
        import traceback
        print(f"[JWT] Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"\n[JWT] Missing token - Error: {str(error)}")
        return jsonify({'error': 'Authorization header is missing'}), 401
    # CORS configuration
    # Allow specific origins in production
    cors_origins_env = os.getenv('CORS_ORIGINS', '*')
    if cors_origins_env == '*':
        # Default: allow all origins (development)
        cors_origins = ['*']
    else:
        # Production: allow specific origins
        cors_origins = [origin.strip() for origin in cors_origins_env.split(',')]
    
    # Get frontend URL from environment
    frontend_url = os.getenv('FRONTEND_URL', '').strip()
    if frontend_url and frontend_url not in cors_origins and '*' not in cors_origins:
        # Remove trailing slash if present
        frontend_url = frontend_url.rstrip('/')
        cors_origins.append(frontend_url)
    
    # Add specific allowed origin
    allowed_origin = 'http://46.224.35.114:3000'
    if allowed_origin not in cors_origins and '*' not in cors_origins:
        cors_origins.append(allowed_origin)
    
    CORS(app, 
         resources={r"/api/*": {
             "origins": cors_origins, 
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "automatic_options": True
         }})
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(instructors_bp, url_prefix='/api/instructors')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(student_groups_bp, url_prefix='/api/student-groups')
    app.register_blueprint(ragflow_bp, url_prefix='/api/ragflow')
    app.register_blueprint(ragflow_documents_bp, url_prefix='/api/ragflow')
    app.register_blueprint(ragflow_chats_bp, url_prefix='/api/ragflow')
    app.register_blueprint(ragflow_sessions_bp, url_prefix='/api/ragflow')
    app.register_blueprint(ragflow_completions_bp, url_prefix='/api/ragflow')
    app.register_blueprint(chat_assignments_bp, url_prefix='/api')
    app.register_blueprint(evaluations_bp, url_prefix='/api')
    app.register_blueprint(student_profile_bp, url_prefix='/api')
    app.register_blueprint(instructor_profile_bp, url_prefix='/api')
    app.register_blueprint(admin_profile_bp, url_prefix='/api')
    
    # Import and register instructor dashboard blueprint
    from routes.instructor_dashboard import instructor_dashboard_bp
    app.register_blueprint(instructor_dashboard_bp, url_prefix='/api')
    
    # Error handler for bad requests
    @app.errorhandler(BadRequest)
    def handle_bad_request(e):
        return jsonify({'error': 'Bad request. Please check your request format.'}), 400
    
    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        return jsonify({'error': 'Unprocessable entity. Please check your request data.'}), 422
    
    # Create tables and seed admin
    with app.app_context():
        db.create_all()
        # Add created_by_instructor_id column if it doesn't exist
        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('student_group')]
            if 'created_by_instructor_id' not in columns:
                print("Adding created_by_instructor_id column to student_group table...")
                db.session.execute(text(
                    "ALTER TABLE student_group "
                    "ADD COLUMN created_by_instructor_id INT NULL"
                ))
                try:
                    db.session.execute(text(
                        "ALTER TABLE student_group "
                        "ADD CONSTRAINT fk_created_by_instructor "
                        "FOREIGN KEY (created_by_instructor_id) REFERENCES instructor(id) "
                        "ON DELETE SET NULL"
                    ))
                except Exception as fk_error:
                    # Foreign key might already exist, that's okay
                    print(f"Note: Could not add foreign key constraint (may already exist): {fk_error}")
                db.session.commit()
                print("Column added successfully!")
        except Exception as e:
            print(f"Note: Could not automatically add column (may already exist): {e}")
            db.session.rollback()
        
        # Add student_id column if it doesn't exist
        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            student_columns = [col['name'] for col in inspector.get_columns('student')]
            if 'student_id' not in student_columns:
                print("Adding student_id column to student table...")
                db.session.execute(text(
                    "ALTER TABLE student "
                    "ADD COLUMN student_id VARCHAR(50) NULL"
                ))
                try:
                    db.session.execute(text(
                        "ALTER TABLE student "
                        "ADD UNIQUE KEY unique_student_id (student_id)"
                    ))
                except Exception as uk_error:
                    # Unique constraint might already exist, that's okay
                    print(f"Note: Could not add unique constraint (may already exist): {uk_error}")
                db.session.commit()
                print("Student ID column added successfully!")
        except Exception as e:
            print(f"Note: Could not automatically add student_id column (may already exist): {e}")
            db.session.rollback()
        
        # Add ragflow_api_key column to instructor table if it doesn't exist
        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            instructor_columns = [col['name'] for col in inspector.get_columns('instructor')]
            if 'ragflow_api_key' not in instructor_columns:
                print("Adding ragflow_api_key column to instructor table...")
                db.session.execute(text(
                    "ALTER TABLE instructor "
                    "ADD COLUMN ragflow_api_key TEXT NULL"
                ))
                db.session.commit()
                print("RAGFlow API key column added successfully!")
        except Exception as e:
            print(f"Note: Could not automatically add ragflow_api_key column (may already exist): {e}")
            db.session.rollback()

        # Create chat assignment tables if they don't exist
        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if 'chat_student_association' not in existing_tables:
                print("Creating chat_student_association table...")
                db.session.execute(text('''
                    CREATE TABLE chat_student_association (
                        chat_id VARCHAR(255) NOT NULL,
                        student_id INT NOT NULL,
                        instructor_id INT NULL,
                        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (chat_id, student_id),
                        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
                        FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE SET NULL
                    )
                '''))
                db.session.commit()
                print("chat_student_association table created successfully!")
            else:
                print("chat_student_association table already exists")
                # Add instructor_id column if it doesn't exist
                try:
                    inspector = inspect(db.engine)
                    columns = [col['name'] for col in inspector.get_columns('chat_student_association')]
                    if 'instructor_id' not in columns:
                        print("Adding instructor_id column to chat_student_association table...")
                        db.session.execute(text('''
                            ALTER TABLE chat_student_association
                            ADD COLUMN instructor_id INT NULL,
                            ADD FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE SET NULL
                        '''))
                        db.session.commit()
                        print("instructor_id column added to chat_student_association!")
                except Exception as e:
                    print(f"Note: Could not add instructor_id column (may already exist): {e}")
                    db.session.rollback()
            
            if 'chat_student_group_association' not in existing_tables:
                print("Creating chat_student_group_association table...")
                db.session.execute(text('''
                    CREATE TABLE chat_student_group_association (
                        chat_id VARCHAR(255) NOT NULL,
                        student_group_id INT NOT NULL,
                        instructor_id INT NULL,
                        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (chat_id, student_group_id),
                        FOREIGN KEY (student_group_id) REFERENCES student_group(id) ON DELETE CASCADE,
                        FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE SET NULL
                    )
                '''))
                db.session.commit()
                print("chat_student_group_association table created successfully!")
            else:
                print("chat_student_group_association table already exists")
                # Add instructor_id column if it doesn't exist
                try:
                    inspector = inspect(db.engine)
                    columns = [col['name'] for col in inspector.get_columns('chat_student_group_association')]
                    if 'instructor_id' not in columns:
                        print("Adding instructor_id column to chat_student_group_association table...")
                        db.session.execute(text('''
                            ALTER TABLE chat_student_group_association
                            ADD COLUMN instructor_id INT NULL,
                            ADD FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE SET NULL
                        '''))
                        db.session.commit()
                        print("instructor_id column added to chat_student_group_association!")
                except Exception as e:
                    print(f"Note: Could not add instructor_id column (may already exist): {e}")
                    db.session.rollback()
            
            # Create student_chat_sessions table to track which sessions belong to which students
            if 'student_chat_sessions' not in existing_tables:
                print("Creating student_chat_sessions table...")
                db.session.execute(text('''
                    CREATE TABLE student_chat_sessions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        student_id INT NOT NULL,
                        chat_id VARCHAR(255) NOT NULL,
                        session_id VARCHAR(255) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_student_session (student_id, chat_id, session_id),
                        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
                    )
                '''))
                db.session.commit()
                print("student_chat_sessions table created successfully!")
            else:
                print("student_chat_sessions table already exists")
            
            # Create evaluation_reports table to store evaluation reports for sessions
            if 'evaluation_reports' not in existing_tables:
                print("Creating evaluation_reports table...")
                db.session.execute(text('''
                    CREATE TABLE evaluation_reports (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        student_id INT NOT NULL,
                        chat_id VARCHAR(255) NOT NULL,
                        session_id VARCHAR(255) NOT NULL,
                        overall_score INT NOT NULL,
                        strengths TEXT,
                        weaknesses TEXT,
                        recommendations TEXT,
                        category_scores JSON,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_session_evaluation (student_id, chat_id, session_id),
                        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
                    )
                '''))
                db.session.commit()
                print("evaluation_reports table created successfully!")
            else:
                print("evaluation_reports table already exists")
        except Exception as e:
            print(f"Note: Could not create chat assignment tables (may already exist): {e}")
            db.session.rollback()
        
        seed_admin()
    
    return app

if __name__ == '__main__':
    # Initialize database if it doesn't exist
    from init_db import create_database_if_not_exists
    success, was_new = create_database_if_not_exists()
    if not success:
        print("[App] Failed to initialize database. Exiting...")
        sys.exit(1)
    
    app = create_app()
    
    # If database was newly created, run migrations after tables are created
    if was_new:
        print("\n[App] New database detected. Running migration scripts...")
        try:
            from run_migrations import run_migrations
            # Run migrations after tables are created (they're created in create_app)
            # Pass the app instance so migrations can use app context
            run_migrations(app)
        except Exception as e:
            print(f"[App] Warning: Could not run migrations: {e}")
            import traceback
            traceback.print_exc()
            print("[App] Continuing startup - migrations may need to be run manually")
    
    port = int(os.getenv('FLASK_PORT', '5000'))
    app.run(host='0.0.0.0', port=port)


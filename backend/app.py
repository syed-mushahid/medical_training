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
    # Allow CORS from all origins (for development)
    # In production, you should restrict this to specific origins
    CORS(app, 
         resources={r"/api/*": {
             "origins": "*", 
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
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
        
        seed_admin()
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)


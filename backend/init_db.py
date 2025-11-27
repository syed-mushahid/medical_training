"""
Database initialization script.
Checks if database exists, creates it if it doesn't, then creates all tables.
"""
import os
import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import sys

def create_database_if_not_exists():
    """Create database if it doesn't exist.
    
    Returns:
        tuple: (success: bool, was_new: bool) - success status and whether database was newly created
    """
    # Get database configuration from environment
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '')
    db_host = os.getenv('DB_HOST', '46.224.35.114')
    db_port = int(os.getenv('DB_PORT', '3306'))
    db_name = os.getenv('DB_NAME', 'training_portal')
    
    print(f"\n[DB Init] Checking database '{db_name}' on {db_host}:{db_port}...")
    
    try:
        # Connect to MySQL server (without specifying database)
        if db_password:
            connection_string = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/"
        else:
            connection_string = f"mysql+pymysql://{db_user}@{db_host}:{db_port}/"
        
        engine = create_engine(connection_string)
        
        # Check if database exists
        was_new = False
        with engine.connect() as conn:
            result = conn.execute(text(f"SHOW DATABASES LIKE '{db_name}'"))
            db_exists = result.fetchone() is not None
            
            if db_exists:
                print(f"[DB Init] Database '{db_name}' already exists.")
            else:
                print(f"[DB Init] Database '{db_name}' does not exist. Creating...")
                # Create database with UTF8MB4 charset for full Unicode support
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                conn.commit()
                print(f"[DB Init] Database '{db_name}' created successfully.")
                was_new = True
        
        engine.dispose()
        return (True, was_new)
        
    except OperationalError as e:
        print(f"[DB Init] Error connecting to MySQL server: {e}")
        print(f"[DB Init] Please ensure MySQL is running and accessible at {db_host}:{db_port}")
        return (False, False)
    except Exception as e:
        print(f"[DB Init] Unexpected error: {e}")
        return (False, False)

if __name__ == '__main__':
    success, was_new = create_database_if_not_exists()
    sys.exit(0 if success else 1)


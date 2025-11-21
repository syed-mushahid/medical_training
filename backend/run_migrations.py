"""
Run all migration scripts after database and tables are created.
This is called automatically when a new database is detected.
Requires Flask app context to be active.
"""
import sys
import os

def run_migrations(app=None):
    """Run all migration scripts.
    
    Args:
        app: Flask app instance. If None, will create one.
    """
    print("\n[Migrations] Running migration scripts...")
    
    # If no app provided, create one
    if app is None:
        from app import create_app
        app = create_app()
    
    success_count = 0
    failed_count = 0
    
    # List of migration scripts to run
    migration_scripts = [
        'migrate_add_created_by'
        # Add more migration script names (without .py) here as they are created
    ]
    
    with app.app_context():
        for script_name in migration_scripts:
            try:
                print(f"[Migrations] Running {script_name}...")
                # Import the migration module
                migration_module = __import__(script_name, fromlist=[''])
                
                # Check if the module has a run_migration function
                if hasattr(migration_module, 'run_migration'):
                    migration_success = migration_module.run_migration()
                    if migration_success:
                        print(f"[Migrations] ✓ {script_name} completed successfully")
                        success_count += 1
                    else:
                        print(f"[Migrations] ✗ {script_name} failed")
                        failed_count += 1
                else:
                    print(f"[Migrations] Warning: {script_name} does not have run_migration() function")
                    failed_count += 1
                
            except ImportError as e:
                print(f"[Migrations] Warning: Could not import {script_name}: {e}")
                print(f"[Migrations] Skipping {script_name}...")
                failed_count += 1
                continue
            except Exception as e:
                print(f"[Migrations] ✗ Error running {script_name}: {e}")
                import traceback
                traceback.print_exc()
                failed_count += 1
                # Don't exit on migration errors - they might be idempotent
                continue
    
    print(f"\n[Migrations] Migration summary: {success_count} succeeded, {failed_count} failed")
    
    if failed_count > 0:
        print("[Migrations] Some migrations failed, but continuing startup...")
        return False
    
    return True

if __name__ == '__main__':
    from app import create_app
    app = create_app()
    success = run_migrations(app)
    sys.exit(0 if success else 1)


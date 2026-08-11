import os
import sys
import shutil

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Contract
from app.utils.storage import ensure_bucket_exists, upload_file_to_minio

def migrate():
    print("Starting database migration to MinIO...")
    
    # 1. Initialize DB Session
    db = SessionLocal()
    
    # 2. Ensure MinIO bucket exists
    if not ensure_bucket_exists():
        print("ERROR: MinIO storage is not available. Make sure the MinIO server is running on port 9000.")
        sys.exit(1)
        
    try:
        # 3. Query all uploaded contracts
        contracts = db.query(Contract).filter(Contract.upload_type == "UPLOAD").all()
        print(f"Found {len(contracts)} upload-type contracts in database.")
        
        migrated_count = 0
        for contract in contracts:
            file_path = contract.file_path
            filename = contract.filename
            
            # Identify if it is a local path
            if file_path and (os.path.isabs(file_path) or "\\" in file_path or "/" in file_path):
                print(f"\nProcessing contract ID {contract.id} ({filename}):")
                print(f"  Current local path: {file_path}")
                
                if os.path.exists(file_path):
                    # Read file bytes
                    with open(file_path, "rb") as f:
                        contents = f.read()
                    
                    # Determine content type
                    content_type = "application/octet-stream"
                    if filename:
                        if filename.lower().endswith(".pdf"):
                            content_type = "application/pdf"
                        elif filename.lower().endswith(".docx"):
                            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    
                    # Upload to MinIO
                    object_name = upload_file_to_minio(filename or "contract.bin", contents, content_type)
                    print(f"  Uploaded to MinIO as: {object_name}")
                    
                    # Update database record
                    contract.file_path = object_name
                    db.commit()
                    print(f"  Updated database record file_path to: {object_name}")
                    
                    # Delete local copy
                    try:
                        os.remove(file_path)
                        print(f"  Deleted local file: {file_path}")
                    except Exception as err:
                        print(f"  WARNING: Could not delete local file {file_path}: {err}")
                        
                    migrated_count += 1
                else:
                    print(f"  WARNING: Local file does not exist on disk. Updating database path to filename...")
                    if filename:
                        contract.file_path = filename
                        db.commit()
                        print(f"  Updated database record file_path to: {filename}")
            else:
                print(f"Contract ID {contract.id} is already using MinIO path/object name: {file_path}")
                
        print(f"\nMigration complete. Successfully migrated {migrated_count} files.")
        
        # 4. Clean up remaining files in uploads directory
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "uploads")
        if os.path.exists(uploads_dir):
            print(f"\nCleaning up uploads directory: {uploads_dir}")
            for item in os.listdir(uploads_dir):
                item_path = os.path.join(uploads_dir, item)
                try:
                    if os.path.isfile(item_path) or os.path.islink(item_path):
                        os.unlink(item_path)
                        print(f"  Removed: {item}")
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                        print(f"  Removed directory: {item}")
                except Exception as e:
                    print(f"  Failed to delete {item_path}. Reason: {e}")
        
    except Exception as e:
        print(f"An error occurred during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

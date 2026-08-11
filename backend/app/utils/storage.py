import os
import io
from typing import Optional
from datetime import datetime
from minio import Minio

def load_env_var(name: str, default: str = "") -> str:
    val = os.environ.get(name)
    if val is not None:
        return val
    
    # Fallback manual parsing of .env
    for path in [".env", "../.env", "backend/.env", "app/.env"]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            if k.strip() == name:
                                return v.strip().strip('"').strip("'")
            except Exception:
                pass
    return default

MINIO_ENDPOINT = load_env_var("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = load_env_var("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = load_env_var("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = load_env_var("MINIO_BUCKET", "contracts")
MINIO_SECURE = load_env_var("MINIO_SECURE", "False").lower() in ("true", "1", "yes")

try:
    minio_client = Minio(
        endpoint=MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )
    # Lazy bucket creation check
    bucket_checked = False
except Exception as e:
    print(f"CRITICAL WARNING: Failed to initialize MinIO client: {e}")
    minio_client = None
    bucket_checked = False

def ensure_bucket_exists():
    global bucket_checked
    if not minio_client:
        return False
    if bucket_checked:
        return True
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
        bucket_checked = True
        return True
    except Exception as e:
        print(f"CRITICAL WARNING: Failed to connect to MinIO or create bucket '{MINIO_BUCKET}': {e}")
        return False

def upload_file_to_minio(filename: str, contents: bytes, content_type: str) -> str:
    """
    Upload file contents to MinIO.
    Handles filename collisions in the bucket by appending a timestamp.
    Returns the object name.
    """
    if not ensure_bucket_exists():
        raise Exception("MinIO storage is currently unavailable.")
        
    object_name = filename
    
    # Check if object already exists to handle collision
    try:
        minio_client.stat_object(MINIO_BUCKET, object_name)
        # If it succeeds, the file already exists, so we append timestamp
        base, ext = os.path.splitext(filename)
        object_name = f"{base}_{int(datetime.now().timestamp())}{ext}"
    except Exception:
        # Object does not exist, safe to upload with original filename
        pass

    try:
        data_stream = io.BytesIO(contents)
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=data_stream,
            length=len(contents),
            content_type=content_type
        )
        return object_name
    except Exception as e:
        print(f"Error uploading file to MinIO: {e}")
        raise Exception(f"Failed to upload file to MinIO: {e}")

def delete_file_from_minio(object_name: str):
    """
    Delete a file from MinIO if it exists.
    """
    if not minio_client:
        return
    try:
        minio_client.remove_object(MINIO_BUCKET, object_name)
    except Exception as e:
        print(f"Error deleting file '{object_name}' from MinIO: {e}")

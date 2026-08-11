from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date
from typing import Optional, List
from . import models, schemas

def get_contract_by_hash(db: Session, file_hash: str) -> Optional[models.Contract]:
    """Retrieve a contract by its file hash for duplicate detection."""
    return db.query(models.Contract).filter(models.Contract.file_hash == file_hash).first()

def get_contracts(db: Session) -> List[models.Contract]:
    """Retrieve all contracts, ordered by creation date descending."""
    return db.query(models.Contract).order_by(desc(models.Contract.created_at)).all()

def get_contract(db: Session, contract_id: int) -> Optional[models.Contract]:
    """Retrieve a single contract by ID."""
    return db.query(models.Contract).filter(models.Contract.id == contract_id).first()

def create_contract(
    db: Session, 
    contract_schema: schemas.ContractCreate,
    filename: Optional[str] = None,
    file_path: Optional[str] = None,
    file_hash: Optional[str] = None,
    text_content: Optional[str] = None,
    upload_type: str = 'MANUAL',
    client_email: Optional[str] = None,
    summary: Optional[str] = None
) -> models.Contract:
    """Create a contract and write an audit log entry."""
    db_contract = models.Contract(
        filename=filename,
        file_path=file_path,
        file_hash=file_hash,
        text_content=text_content,
        employer_name=contract_schema.employer_name,
        client_name=contract_schema.client_name,
        company_name=contract_schema.company_name,
        start_date=contract_schema.start_date,
        end_date=contract_schema.end_date,
        upload_type=upload_type,
        client_email=client_email if client_email is not None else contract_schema.client_email,
        summary=summary if summary is not None else contract_schema.summary
    )
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    
    # Audit log
    details = f"Created contract ID {db_contract.id} ({db_contract.employer_name} - {db_contract.client_name}) via {upload_type}."
    create_audit_log(db, action="CREATE_CONTRACT", details=details)
    
    return db_contract

def delete_contract(db: Session, contract_id: int) -> bool:
    """Delete a contract and write an audit log entry."""
    db_contract = get_contract(db, contract_id)
    if not db_contract:
        return False
    
    filename_or_desc = db_contract.filename or f"Manual ID {db_contract.id}"
    details = f"Deleted contract ID {contract_id} ({filename_or_desc})."
    
    db.delete(db_contract)
    db.commit()
    
    create_audit_log(db, action="DELETE_CONTRACT", details=details)
    return True

def create_audit_log(db: Session, action: str, details: str) -> models.AuditLog:
    """Write a new entry to the system audit logs."""
    db_log = models.AuditLog(action=action, details=details)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_audit_logs(db: Session) -> List[models.AuditLog]:
    """Retrieve all audit logs ordered by time descending."""
    return db.query(models.AuditLog).order_by(desc(models.AuditLog.timestamp)).all()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Retrieve a user by email."""
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user_in: schemas.UserRegister) -> models.User:
    """Create a new user, hashing their password and storing extra details in the username field."""
    from .utils.auth import hash_password
    import json
    
    # Serialize metadata into the username field
    metadata = {
        "full_name": user_in.full_name,
        "company_name": user_in.company_name,
        "phone_number": user_in.phone_number
    }
    username_val = json.dumps(metadata)
    
    db_user = models.User(
        username=username_val,
        email=user_in.email,
        hashed_password=hash_password(user_in.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    create_audit_log(db, action="REGISTER_USER", details=f"Successfully registered new user: {user_in.email}")
    return db_user


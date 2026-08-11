import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, or_, desc
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List

from .database import engine, Base, get_db, get_db_info
from . import models, schemas, crud
from .utils.nlp import calculate_file_hash, extract_text_from_pdf, extract_text_from_docx, search_semantic, classify_query, search_bm25
from .utils.extraction import extract_metadata_from_text, load_api_key
from .utils.storage import upload_file_to_minio, delete_file_from_minio
from .utils.email_service import send_email_notification

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
from .utils.auth import decode_jwt_token, create_jwt_token, verify_password
from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    email: str

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Contract Management System API")

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
        )
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )
    return user

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. Vite dev server uses dynamic ports sometimes.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/register", response_model=schemas.Token)
async def register_endpoint(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
    user = crud.create_user(db, user_in)
    token_data = {"sub": str(user.id), "email": user.email}
    token = create_jwt_token(token_data)
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login", response_model=schemas.Token)
async def login_endpoint(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    token_data = {"sub": str(user.id), "email": user.email}
    token = create_jwt_token(token_data)
    crud.create_audit_log(db, action="LOGIN_USER", details=f"User logged in: {user.email}")
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/api/auth/forgot-password")
async def forgot_password_endpoint(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=req.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")
    import secrets
    reset_code = secrets.token_hex(4).upper()
    user.reset_token = reset_code
    db.commit()
    print("\n" + "="*50)
    print(f"PASSWORD RESET CODE FOR {user.email}: {reset_code}")
    print("="*50 + "\n")
    
    # Send password reset email via EmailJS
    send_email_notification(
        to_email=user.email,
        client_name=user.username or user.email,
        contract_title="Password Reset Request",
        end_date="N/A",
        days_left=0,
        custom_message=f"Hello,\n\nYour password reset code for AI Contract Management is: {reset_code}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nAI Contract Management Security",
        employer_name="AI Contract Management Security",
        company_name="AI Contract Management"
    )
    
    crud.create_audit_log(db, action="FORGOT_PASSWORD", details=f"Password reset code generated and sent for {user.email}")
    return {"detail": "Password reset instructions have been sent to your email."}


def build_contract_response(c: models.Contract) -> schemas.ContractResponse:
    """Helper to convert a DB Contract model into schemas.ContractResponse with calculated states."""
    today = date.today()
    days_left = (c.end_date - today).days
    
    if days_left < 0:
        status = "expired"
    elif days_left <= 5:
        status = "expiring_soon"
    else:
        status = "active"
        
    return schemas.ContractResponse(
        id=c.id,
        filename=c.filename,
        file_path=c.file_path,
        file_hash=c.file_hash,
        employer_name=c.employer_name,
        client_name=c.client_name,
        company_name=c.company_name,
        start_date=c.start_date,
        end_date=c.end_date,
        upload_type=c.upload_type,
        created_at=c.created_at,
        days_until_expiry=days_left,
        status=status,
        client_email=c.client_email,
        summary=c.summary,
        notification_status=c.notification_status,
        notification_sent_at=c.notification_sent_at
    )


@app.post("/api/contracts/upload", response_model=schemas.ContractResponse)
async def upload_contract(
    file: UploadFile = File(...),
    employer_name: str = Form(None),
    client_name: str = Form(None),
    client_email: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a PDF or DOCX, extract metadata and text, index it, check duplicate hash, and save."""
    # Read bytes
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Calculate duplicate detection hash
    file_hash = calculate_file_hash(contents)
    duplicate = crud.get_contract_by_hash(db, file_hash)
    if duplicate:
        crud.create_audit_log(db, action="UPLOAD_DUPLICATE_REJECTED", details=f"Rejected upload of duplicate file: {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"Duplicate file detected! The contract '{file.filename}' has already been uploaded as '{duplicate.filename}'."
        )

    # Extract text from PDF or DOCX
    text = ""
    if file.filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(contents)
    elif file.filename.lower().endswith(".docx"):
        text = extract_text_from_docx(contents)
    else:
        # Generic text decoding fallback
        try:
            text = contents.decode("utf-8")
        except Exception:
            text = "Non-parseable binary document contents."

    # Parse metadata using NLP extractor
    meta = extract_metadata_from_text(text)

    # Save file to MinIO bucket
    file_path = upload_file_to_minio(file.filename, contents, file.content_type)

    # Create record in DB
    contract_create = schemas.ContractCreate(
        employer_name=employer_name if employer_name else meta["employer_name"],
        client_name=client_name if client_name else meta["client_name"],
        company_name=meta["company_name"],
        start_date=meta["start_date"],
        end_date=meta["end_date"]
    )
    
    new_contract = crud.create_contract(
        db=db,
        contract_schema=contract_create,
        filename=file.filename,
        file_path=file_path,
        file_hash=file_hash,
        text_content=text,
        upload_type="UPLOAD",
        client_email=client_email if client_email else meta.get("client_email"),
        summary=meta.get("summary")
    )
    
    crud.create_audit_log(db, action="UPLOAD_CONTRACT", details=f"Uploaded and indexed contract document: '{file.filename}'")
    
    return build_contract_response(new_contract)

@app.post("/api/contracts/manual", response_model=schemas.ContractResponse)
async def create_manual_contract(contract_in: schemas.ContractCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Manually enter details for a contract without file upload."""
    if contract_in.end_date < contract_in.start_date:
        raise HTTPException(status_code=400, detail="Contract end date cannot be before start date.")

    new_contract = crud.create_contract(
        db=db,
        contract_schema=contract_in,
        upload_type="MANUAL"
    )
    
    return build_contract_response(new_contract)

@app.get("/api/contracts", response_model=List[schemas.ContractResponse])
async def list_contracts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List all contract records in the system."""
    check_and_trigger_automatic_notifications(db)
    contracts = crud.get_contracts(db)
    return [build_contract_response(c) for c in contracts]

@app.delete("/api/contracts/{contract_id}")
async def delete_contract(contract_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a contract record."""
    contract = crud.get_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # Delete from MinIO if it was an uploaded document
    if contract.upload_type == "UPLOAD" and contract.file_path:
        delete_file_from_minio(contract.file_path)
        
    crud.delete_contract(db, contract_id)
    return {"detail": "Contract deleted successfully"}

def parse_metadata_filters(q: str):
    import re
    from datetime import date, timedelta
    from sqlalchemy import or_
    
    q_lower = q.lower().strip()
    today = date.today()
    filters = []
    
    # 1. Active / Expired / Expiring Soon filters
    if "expired" in q_lower:
        filters.append(models.Contract.end_date < today)
    elif "active" in q_lower:
        filters.append(models.Contract.start_date <= today)
        filters.append(models.Contract.end_date >= today)
    elif "expiring" in q_lower or "due" in q_lower or "renewal" in q_lower:
        days_match = re.search(r'(\d+)\s*days?', q_lower)
        if days_match:
            days = int(days_match.group(1))
        elif "next month" in q_lower:
            days = 30
        elif "soon" in q_lower:
            days = 5
        else:
            days = 30
            
        filters.append(models.Contract.end_date >= today)
        filters.append(models.Contract.end_date <= today + timedelta(days=days))
        
    # 2. Contract Type filters (NDA, SLA, Service Agreement)
    if "nda" in q_lower or "non-disclosure" in q_lower or "nondisclosure" in q_lower:
        filters.append(or_(
            models.Contract.filename.like("%NDA%"),
            models.Contract.filename.like("%Non-Disclosure%"),
            models.Contract.filename.like("%Nondisclosure%"),
            models.Contract.text_content.like("%NDA%"),
            models.Contract.text_content.like("%Non-Disclosure%"),
            models.Contract.text_content.like("%Nondisclosure%")
        ))
    elif "sla" in q_lower or "service level" in q_lower:
        filters.append(or_(
            models.Contract.filename.like("%SLA%"),
            models.Contract.filename.like("%Service Level%"),
            models.Contract.text_content.like("%SLA%"),
            models.Contract.text_content.like("%Service Level%")
        ))
    elif "service agreement" in q_lower or "services agreement" in q_lower:
        filters.append(or_(
            models.Contract.filename.like("%Service Agreement%"),
            models.Contract.filename.like("%Services Agreement%"),
            models.Contract.text_content.like("%Service Agreement%"),
            models.Contract.text_content.like("%Services Agreement%")
        ))
        
    # 3. Company/Client name filters
    clean_q = q_lower
    for word in ["expired", "active", "expiring", "renewal", "due", "soon", "contracts", "contract", "nda", "sla", "agreement", "agreements", "in", "days", "day", "next", "month", "months", "year", "years"]:
        clean_q = re.sub(r'\b' + word + r'\b', '', clean_q)
    clean_q = re.sub(r'\b\d+\b', '', clean_q)
        
    rel_match = re.search(r'\b(?:of|with|by|for)\s+([a-z0-9\s]+)', clean_q)
    company_candidate = ""
    if rel_match:
        company_candidate = rel_match.group(1).strip()
    else:
        company_candidate = clean_q.strip()
        
    company_candidate = re.sub(r'\s+', ' ', company_candidate).strip()
    
    if company_candidate and len(company_candidate) > 1:
        filters.append(or_(
            models.Contract.company_name.like(f"%{company_candidate}%"),
            models.Contract.client_name.like(f"%{company_candidate}%"),
            models.Contract.employer_name.like(f"%{company_candidate}%")
        ))
        
    return filters

def generate_rag_answer(question: str, contract_text: str, api_key: str) -> str:
    import requests
    import json
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    context_text = contract_text[:12000]
    
    prompt = f"""
You are an expert contract AI assistant. Answer the user's question briefly and accurately based ONLY on the provided contract text. If the answer cannot be found in the text, say "Answer not found in contract."

Contract Context:
{context_text}

Question: {question}

Answer:
"""
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            res_data = response.json()
            answer = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return answer
    except Exception as e:
        print(f"Error calling Gemini in RAG: {e}")
        
    return "Unable to retrieve answer from AI service."

@app.get("/api/contracts/search", response_model=List[schemas.SearchResultResponse])
async def search_contracts(q: str = Query("", description="Search term for semantic search"), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Run an intelligent hybrid search routing metadata, keywords, and content questions."""
    check_and_trigger_automatic_notifications(db)
    if not q.strip():
        contracts = crud.get_contracts(db)
        crud.create_audit_log(db, action="SEARCH_CONTRACTS", details="Listed contracts without filter query.")
        return [schemas.SearchResultResponse(contract=build_contract_response(c), score=1.0) for c in contracts]
        
    # 1. Classify the user query
    classification = classify_query(q)
    log_action = "SEARCH_SEMANTIC" if classification in ["KEYWORD", "RAG"] else "SEARCH_CONTRACTS"
    crud.create_audit_log(db, action=log_action, details=f"Query classified as {classification}: '{q}'")
    
    # 2. Route the query
    if classification == "METADATA":
        filters = parse_metadata_filters(q)
        if filters:
            contracts = db.query(models.Contract).filter(and_(*filters)).order_by(desc(models.Contract.created_at)).all()
        else:
            contracts = crud.get_contracts(db)
        return [schemas.SearchResultResponse(contract=build_contract_response(c), score=1.0) for c in contracts]
        
    elif classification == "KEYWORD":
        contracts = crud.get_contracts(db)
        results = search_bm25(q, contracts)
        return [
            schemas.SearchResultResponse(
                contract=build_contract_response(c),
                score=round(score, 4)
            )
            for c, score in results
        ]
        
    else:  # RAG Search
        contracts = crud.get_contracts(db)
        results = search_semantic(q, contracts)
        response_list = []
        api_key = load_api_key()
        
        for idx, (c, score) in enumerate(results):
            c_resp = build_contract_response(c)
            # Answer question using Gemini for the top-matching contract
            if idx == 0 and score > 0.1 and api_key:
                answer = generate_rag_answer(q, c.text_content or "", api_key)
                answer_clean = answer.replace('\n', ' ').strip()
                if len(answer_clean) > 200:
                    answer_clean = answer_clean[:197] + "..."
                c_resp.filename = f"[Answer: {answer_clean}] {c.filename or 'Manual Entry'}"
                
            response_list.append(
                schemas.SearchResultResponse(
                    contract=c_resp,
                    score=round(score, 4)
                )
            )
        return response_list


@app.get("/api/kpis", response_model=schemas.KPIResponse)
async def get_kpis(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Retrieve dynamic key metrics: total count, expiring soon (<=5 days), and active."""
    check_and_trigger_automatic_notifications(db)
    contracts = crud.get_contracts(db)
    today = date.today()
    
    total = len(contracts)
    expiring = 0
    active = 0
    
    for c in contracts:
        days_left = (c.end_date - today).days
        
        # Expiring soon if within 5 days (and not already expired)
        if 0 <= days_left <= 5:
            expiring += 1
            
        # Active if start_date <= today <= end_date
        if c.start_date <= today <= c.end_date:
            active += 1
            
    return schemas.KPIResponse(
        total_contracts=total,
        expiring_soon=expiring,
        active_contracts=active
    )

@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse])
async def list_audit_logs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get history of all system audit logs."""
    logs = crud.get_audit_logs(db)
    return logs


def check_and_trigger_automatic_notifications(db: Session):
    """Find active contracts expiring in <= 5 days that haven't been notified, and send automated email via EmailJS."""
    today = date.today()
    five_days_later = today + timedelta(days=5)
    
    # Fetch active contracts expiring within 5 days that have not had notifications sent
    expiring_contracts = db.query(models.Contract).filter(
        models.Contract.end_date >= today,
        models.Contract.end_date <= five_days_later,
        or_(models.Contract.notification_status == False, models.Contract.notification_status == None)
    ).all()
    
    for c in expiring_contracts:
        email_addr = c.client_email or "unknown-client@example.com"
        days_left = (c.end_date - today).days
        contract_title = c.filename or f"Contract #{c.id} ({c.employer_name} - {c.client_name})"
        
        body = f"Hello {c.client_name},\n\nThis is a reminder that your contract '{contract_title}' will expire on {c.end_date}.\n\nThere are {days_left} days left for the contract to expire.\n\nRegards,\nAI Contract Management System"
        
        print("\n" + "*"*60)
        print(f"[AUTOMATED EMAIL] Dispatching EmailJS notification to: {email_addr}")
        print(f"SUBJECT: Contract Expiry Reminder - {contract_title}")
        print("*"*60 + "\n")
        
        # Send email via EmailJS
        email_res = send_email_notification(
            to_email=email_addr,
            client_name=c.client_name,
            contract_title=contract_title,
            end_date=str(c.end_date),
            days_left=days_left,
            custom_message=body,
            employer_name=c.employer_name,
            company_name=c.company_name
        )
        
        # Update database
        c.notification_status = True
        c.notification_sent_at = datetime.utcnow()
        
        # Create audit log
        log_details = f"Automated expiry notification email dispatched via EmailJS to {email_addr} for contract ID {c.id} (expires {c.end_date}). Result: {'SUCCESS' if email_res.get('success') else 'FAILED'}"
        crud.create_audit_log(db, action="SEND_EXPIRY_NOTIFICATION", details=log_details)
        
    if expiring_contracts:
        db.commit()


@app.post("/api/contracts/{contract_id}/send-expiry-notification", response_model=schemas.ContractResponse)
async def send_expiry_notification(
    contract_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Manually trigger an email alert to the client for an expiring contract via EmailJS."""
    c = crud.get_contract(db, contract_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    today = date.today()
    days_left = (c.end_date - today).days
    
    email_addr = c.client_email or "unknown-client@example.com"
    contract_title = c.filename or f"Contract #{c.id} ({c.employer_name} - {c.client_name})"
    body = f"Hello {c.client_name},\n\nThis is a reminder that your contract '{contract_title}' will expire on {c.end_date}.\n\nThere are {days_left} days left for the contract to expire.\n\nRegards,\nAI Contract Management System"
    
    print("\n" + "*"*60)
    print(f"[MANUAL EMAIL TRIGGER] Dispatching EmailJS notification to: {email_addr}")
    print(f"SUBJECT: Contract Expiry Reminder - {contract_title}")
    print("*"*60 + "\n")
    
    # Send email via EmailJS
    email_res = send_email_notification(
        to_email=email_addr,
        client_name=c.client_name,
        contract_title=contract_title,
        end_date=str(c.end_date),
        days_left=days_left,
        custom_message=body,
        employer_name=c.employer_name,
        company_name=c.company_name
    )
    
    # Update status
    c.notification_status = True
    c.notification_sent_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    
    # Audit Log
    log_details = f"Manually triggered expiry notification email dispatched via EmailJS to {email_addr} for contract ID {c.id} (expires {c.end_date}). Result: {'SUCCESS' if email_res.get('success') else 'FAILED'}"
    crud.create_audit_log(db, action="SEND_EXPIRY_NOTIFICATION", details=log_details)
    
    return build_contract_response(c)

@app.get("/api/system/db-status")
def system_db_status():
    """Retrieve current database connection status and fallback state."""
    return get_db_info()



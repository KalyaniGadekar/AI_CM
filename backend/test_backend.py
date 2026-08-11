import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, get_db
from app.main import app, get_current_user
import app.main as app_main
app_main.upload_file_to_minio = lambda filename, contents, content_type: filename
app_main.delete_file_from_minio = lambda object_name: None
from app.models import Contract, AuditLog, User

import pytest

# Create clean testing database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_contracts.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id=1, email="test@example.com", username="{\"full_name\": \"Test User\", \"company_name\": \"Test Co\", \"phone_number\": \"123\"}")

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_contracts.db"):
        try:
            os.remove("./test_contracts.db")
        except PermissionError:
            pass


client = TestClient(app)


def test_db_status():
    response = client.get("/api/system/db-status")
    assert response.status_code == 200
    data = response.json()
    assert "active_db_type" in data
    assert "status" in data
    assert data["status"] in ["connected", "fallback", "initialized"]

def test_initial_state():
    # 1. Test initial KPIs
    response = client.get("/api/kpis")
    assert response.status_code == 200
    data = response.json()
    assert data["total_contracts"] == 0
    assert data["expiring_soon"] == 0
    assert data["active_contracts"] == 0

    # 2. Test initial contracts list
    response = client.get("/api/contracts")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_create_manual_contract():
    # 1. Create contract manually
    from datetime import date, timedelta
    today = date.today()
    payload = {
        "employer_name": "Test Company Rep",
        "client_name": "Test Client Name",
        "company_name": "Test Client Partner Corp",
        "start_date": str(today - timedelta(days=30)),
        "end_date": str(today + timedelta(days=3))
    }
    response = client.post("/api/contracts/manual", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["employer_name"] == "Test Company Rep"
    assert data["client_name"] == "Test Client Name"
    assert data["upload_type"] == "MANUAL"
    assert data["status"] == "expiring_soon" # expiring in 3 days, <= 5 days

    # 2. Verify KPI update
    response = client.get("/api/kpis")
    data = response.json()
    assert data["total_contracts"] == 1
    assert data["expiring_soon"] == 1
    assert data["active_contracts"] == 1

def test_upload_duplicate_detection():
    # 1. Create a dummy text file to simulate contract upload
    file_content = b"This is a contract between Acme Employer and Beta Client. Effective start date 2026-01-01, expiration end date 2027-01-01."
    files = {"file": ("acme_contract.txt", file_content, "text/plain")}
    
    response = client.post("/api/contracts/upload", files=files)
    assert response.status_code == 200
    uploaded_data = response.json()
    assert uploaded_data["id"] is not None
    assert uploaded_data["upload_type"] == "UPLOAD"
    assert uploaded_data["file_hash"] is not None
    
    # 2. Attempt duplicate upload
    files_dup = {"file": ("acme_contract_duplicate.txt", file_content, "text/plain")}
    response_dup = client.post("/api/contracts/upload", files=files_dup)
    
    # Rejects and raises 400 Bad Request
    assert response_dup.status_code == 400
    assert "Duplicate file detected" in response_dup.json()["detail"]

def test_semantic_search():
    # 1. Query search for Beta Client
    response = client.get("/api/contracts/search?q=Beta Client")
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    # First result should have high score
    assert "acme_contract" in results[0]["contract"]["filename"]
    assert results[0]["score"] > 0.4

    # 2. Query search for something non-existent
    response_empty = client.get("/api/contracts/search?q=xyzqwer")
    assert response_empty.status_code == 200
    results_empty = response_empty.json()
    # It might return them with 0 score, let's verify
    if results_empty:
        assert results_empty[0]["score"] == 0.0

def test_audit_logs():
    # Fetch audit logs
    response = client.get("/api/audit-logs")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) > 0
    
    # Assert specific operations are logged
    actions = [l["action"] for l in logs]
    assert "CREATE_CONTRACT" in actions
    assert "UPLOAD_CONTRACT" in actions
    assert "UPLOAD_DUPLICATE_REJECTED" in actions
    assert "SEARCH_SEMANTIC" in actions

def test_auth_flow():
    # Temporarily remove get_current_user override to test actual authentication enforcement
    had_override = get_current_user in app.dependency_overrides
    if had_override:
        del app.dependency_overrides[get_current_user]
        
    try:
        auth_client = TestClient(app)

        # 1. Unauthenticated request to /api/contracts should fail (401)
        response = auth_client.get("/api/contracts")
        assert response.status_code == 401

        # 2. Register a new user
        reg_payload = {
            "email": "user@example.com",
            "password": "Password123",
            "full_name": "John Doe",
            "company_name": "Acme Corp",
            "phone_number": "555-0199"
        }
        response = auth_client.post("/api/auth/register", json=reg_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "user@example.com"
        assert data["user"]["full_name"] == "John Doe"
        assert data["user"]["company_name"] == "Acme Corp"
        assert data["user"]["phone_number"] == "555-0199"

        # 3. Duplicate registration should fail
        response = auth_client.post("/api/auth/register", json=reg_payload)
        assert response.status_code == 400

        # 4. Login with correct credentials
        login_payload = {
            "email": "user@example.com",
            "password": "Password123"
        }
        response = auth_client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 200
        login_data = response.json()
        token = login_data["access_token"]
        assert token is not None

        # 5. Login with incorrect credentials should fail
        bad_login_payload = {
            "email": "user@example.com",
            "password": "WrongPassword"
        }
        response = auth_client.post("/api/auth/login", json=bad_login_payload)
        assert response.status_code == 400

        # 6. Authenticated request to /api/contracts should succeed
        headers = {"Authorization": f"Bearer {token}"}
        response = auth_client.get("/api/contracts", headers=headers)
        assert response.status_code == 200

        # 7. Request with invalid token should fail
        bad_headers = {"Authorization": "Bearer invalidtoken123"}
        response = auth_client.get("/api/contracts", headers=bad_headers)
        assert response.status_code == 401

        # 8. Forgot password request
        response = auth_client.post("/api/auth/forgot-password", json={"email": "user@example.com"})
        assert response.status_code == 200
        assert "sent" in response.json()["detail"]

        # 9. Forgot password for non-existent email should fail
        response = auth_client.post("/api/auth/forgot-password", json={"email": "nonexistent@example.com"})
        assert response.status_code == 404
    finally:
        if had_override:
            app.dependency_overrides[get_current_user] = override_get_current_user

def test_expiry_notification():
    # 1. Create a contract manually expiring in 3 days with client email and summary
    from datetime import date, timedelta
    today = date.today()
    payload = {
        "employer_name": "Acme Employer",
        "client_name": "Client Representative",
        "company_name": "Acme Partner LLC",
        "start_date": str(today - timedelta(days=10)),
        "end_date": str(today + timedelta(days=3)),
        "client_email": "recipient@example.com",
        "summary": "This is a test contract for email notifications."
    }
    response = client.post("/api/contracts/manual", json=payload)
    assert response.status_code == 200
    data = response.json()
    contract_id = data["id"]
    assert data["client_email"] == "recipient@example.com"
    assert data["summary"] == "This is a test contract for email notifications."
    assert data["notification_status"] is False
    
    # 2. Trigger notification manually
    notify_response = client.post(f"/api/contracts/{contract_id}/send-expiry-notification")
    assert notify_response.status_code == 200
    notify_data = notify_response.json()
    assert notify_data["notification_status"] is True
    assert notify_data["notification_sent_at"] is not None
    
    # 3. Verify audit log entry is written
    audit_response = client.get("/api/audit-logs")
    assert audit_response.status_code == 200
    logs = audit_response.json()
    actions = [l["action"] for l in logs]
    assert "SEND_EXPIRY_NOTIFICATION" in actions

if __name__ == "__main__":
    setup_module(None)
    try:
        test_initial_state()
        test_create_manual_contract()
        test_upload_duplicate_detection()
        test_semantic_search()
        test_audit_logs()
        test_auth_flow()
        test_expiry_notification()
        print("\nAll Backend Tests Completed Successfully!")
    finally:
        teardown_module(None)

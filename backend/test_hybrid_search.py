import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, get_db
from app.main import app, get_current_user
import app.main as app_main
from app.models import Contract, User
from app.utils.nlp import classify_query

# Override upload/delete to minio to avoid minio dependencies
app_main.upload_file_to_minio = lambda filename, contents, content_type: filename
app_main.delete_file_from_minio = lambda object_name: None

# Use separate test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_hybrid.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id=1, email="test_hybrid@example.com", username="{\"full_name\": \"Tester\", \"company_name\": \"Test Co\", \"phone_number\": \"123\"}")

client = TestClient(app)

def setup_module(module=None):
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    
    # Insert test contracts
    db = TestingSessionLocal()
    today = date.today()
    
    # 1. Expired contract (ABC Technologies)
    c1 = Contract(
        filename="abc_expired_nda.docx",
        file_path="abc_expired_nda.docx",
        file_hash="hash1",
        text_content="This is a Non-Disclosure Agreement between ABC Technologies and Tester. Effective date Jan 1, 2026, expiring in June.",
        employer_name="ABC Technologies",
        client_name="Tester",
        company_name="ABC Technologies",
        start_date=today - timedelta(days=200),
        end_date=today - timedelta(days=20),  # Expired
        upload_type="UPLOAD"
    )
    
    # 2. Active contract (XYZ Corp)
    c2 = Contract(
        filename="xyz_active_service.docx",
        file_path="xyz_active_service.docx",
        file_hash="hash2",
        text_content="Service Level Agreement for IT services between XYZ Corp and Tester. Net 30 payment terms. This contract can be terminated with 30 days written notice.",
        employer_name="XYZ Corp",
        client_name="Tester",
        company_name="XYZ Corp",
        start_date=today - timedelta(days=50),
        end_date=today + timedelta(days=150),  # Active
        upload_type="UPLOAD"
    )
    
    # 3. Expiring soon contract (Due Corp)
    c3 = Contract(
        filename="due_soon.docx",
        file_path="due_soon.docx",
        file_hash="hash3",
        text_content="General supply agreement between Due Corp and Tester. Active but due soon.",
        employer_name="Due Corp",
        client_name="Tester",
        company_name="Due Corp",
        start_date=today - timedelta(days=20),
        end_date=today + timedelta(days=12),  # Expiring in 12 days
        upload_type="UPLOAD"
    )
    
    db.add(c1)
    db.add(c2)
    db.add(c3)
    db.commit()
    db.close()

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_hybrid.db"):
        try:
            os.remove("./test_hybrid.db")
        except PermissionError:
            pass

def test_query_classification():
    # Test Metadata triggers
    assert classify_query("expired contracts") == "METADATA"
    assert classify_query("active contracts") == "METADATA"
    assert classify_query("contracts expiring in 30 days") == "METADATA"
    assert classify_query("contracts of ABC Technologies") == "METADATA"
    assert classify_query("NDA contracts") == "METADATA"
    
    # Test RAG triggers
    assert classify_query("summarize this contract") == "RAG"
    assert classify_query("what are the payment terms?") == "RAG"
    assert classify_query("termination clause in XYZ contract") == "RAG"
    assert classify_query("obligations of XYZ") == "RAG"
    
    # Test Keyword triggers
    assert classify_query("Security Agreement") == "KEYWORD"
    assert classify_query("XYZ Corp") == "KEYWORD"

def test_metadata_search_expired():
    response = client.get("/api/contracts/search?q=expired contracts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["contract"]["filename"] == "abc_expired_nda.docx"

def test_metadata_search_active():
    response = client.get("/api/contracts/search?q=active contracts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    filenames = [item["contract"]["filename"] for item in data]
    assert "xyz_active_service.docx" in filenames
    assert "due_soon.docx" in filenames

def test_metadata_search_expiring_soon():
    # "expiring in 15 days" -> should return due_soon.docx (expires in 12 days)
    response = client.get("/api/contracts/search?q=contracts expiring in 15 days")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["contract"]["filename"] == "due_soon.docx"

def test_metadata_search_company():
    response = client.get("/api/contracts/search?q=contracts of ABC Technologies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["contract"]["filename"] == "abc_expired_nda.docx"

def test_keyword_search_bm25():
    # BM25 should match "service" to xyz_active_service.docx and rank it highest
    response = client.get("/api/contracts/search?q=service")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    # First result should be the service agreement
    assert data[0]["contract"]["filename"] == "xyz_active_service.docx"
    assert data[0]["score"] > 0.0

def test_rag_search_routing():
    # Test that content question is classified as RAG
    # Mock generation of RAG answer to avoid actual Gemini API call
    original_generate = app_main.generate_rag_answer
    app_main.generate_rag_answer = lambda q, txt, key: "Test Answer: Net 30 payment."
    
    original_load_key = app_main.load_api_key
    app_main.load_api_key = lambda: "fake-api-key"
    
    try:
        response = client.get("/api/contracts/search?q=what is the payment terms?")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # The top matching contract should have the answer prepended
        assert "[Answer: Test Answer: Net 30 payment.]" in data[0]["contract"]["filename"]
    finally:
        app_main.generate_rag_answer = original_generate
        app_main.load_api_key = original_load_key

if __name__ == "__main__":
    setup_module(None)
    try:
        print("Running query classification tests...")
        test_query_classification()
        print("Running expired metadata search tests...")
        test_metadata_search_expired()
        print("Running active metadata search tests...")
        test_metadata_search_active()
        print("Running expiring soon metadata search tests...")
        test_metadata_search_expiring_soon()
        print("Running company metadata search tests...")
        test_metadata_search_company()
        print("Running keyword search BM25 tests...")
        test_keyword_search_bm25()
        print("Running RAG search routing tests...")
        test_rag_search_routing()
        print("\nAll Hybrid Search Tests Completed Successfully!")
    finally:
        teardown_module(None)

from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    reset_token = Column(String, nullable=True) # stores the 6-digit password reset code
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to contracts
    contracts = relationship("Contract", back_populates="owner", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        try:
            import json
            data = json.loads(self.username)
            return data.get("full_name", self.username)
        except Exception:
            return self.username

    @property
    def company_name(self) -> str:
        try:
            import json
            data = json.loads(self.username)
            return data.get("company_name", "")
        except Exception:
            return ""

    @property
    def phone_number(self) -> str:
        try:
            import json
            data = json.loads(self.username)
            return data.get("phone_number", "")
        except Exception:
            return ""

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_hash = Column(String, unique=True, index=True, nullable=True)
    text_content = Column(Text, nullable=True)
    employer_name = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    upload_type = Column(String, nullable=False) # 'UPLOAD' or 'MANUAL'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Enhanced features fields
    client_email = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    notification_status = Column(Boolean, default=False, nullable=True)
    notification_sent_at = Column(DateTime, nullable=True)
    
    # User scoping foreign key
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    owner = relationship("User", back_populates="contracts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


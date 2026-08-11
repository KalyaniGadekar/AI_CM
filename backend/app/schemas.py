from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List

class ContractBase(BaseModel):
    employer_name: str
    client_name: str
    company_name: str
    start_date: date
    end_date: date
    client_email: Optional[str] = None
    summary: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    filename: Optional[str] = None
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    upload_type: str
    created_at: datetime
    days_until_expiry: int
    status: str # 'active', 'expiring_soon' (<= 5 days), 'expired'
    summary: Optional[str] = None
    notification_status: Optional[bool] = False
    notification_sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: str
    timestamp: datetime

    class Config:
        from_attributes = True

class KPIResponse(BaseModel):
    total_contracts: int
    expiring_soon: int
    active_contracts: int

class SearchResultResponse(BaseModel):
    contract: ContractResponse
    score: float

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str
    phone_number: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    company_name: str
    phone_number: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


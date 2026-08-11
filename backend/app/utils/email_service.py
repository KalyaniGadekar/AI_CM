import os
import requests
from typing import Dict, Any, Optional

def load_env_var(name: str, default: str = "") -> str:
    val = os.environ.get(name)
    if val is not None:
        return val
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

EMAILJS_SERVICE_ID = load_env_var("EMAILJS_SERVICE_ID", "service_fk7d9bp")
EMAILJS_TEMPLATE_ID = load_env_var("EMAILJS_TEMPLATE_ID", "template_yunwgcv")
EMAILJS_PUBLIC_KEY = load_env_var("EMAILJS_PUBLIC_KEY", "IJxjBjS0m-gQq8883")
EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send"

def send_email_notification(
    to_email: str,
    client_name: str,
    contract_title: str,
    end_date: str,
    days_left: int,
    custom_message: Optional[str] = None,
    employer_name: Optional[str] = None,
    company_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends real email notification to the recipient using EmailJS REST API.
    """
    if not custom_message:
        custom_message = (
            f"Hello {client_name},\n\n"
            f"This is a reminder that your contract '{contract_title}' will expire on {end_date}.\n\n"
            f"There are {days_left} days left for the contract to expire.\n\n"
            f"Regards,\nAI Contract Management System"
        )
    
    subject = f"Contract Expiry Reminder: {contract_title} ({days_left} days left)"

    # Comprehensive template parameter aliases to match EmailJS template variables
    template_params = {
        "to_email": to_email,
        "email": to_email,
        "recipient_email": to_email,
        "client_email": to_email,
        "to_name": client_name,
        "client_name": client_name,
        "name": client_name,
        "contract_title": contract_title,
        "contract_name": contract_title,
        "filename": contract_title,
        "end_date": str(end_date),
        "expiry_date": str(end_date),
        "days_left": str(days_left),
        "days_until_expiry": str(days_left),
        "message": custom_message,
        "body": custom_message,
        "subject": subject,
        "employer_name": employer_name or "AI Contract Management",
        "company_name": company_name or "AI Contract Management"
    }

    payload = {
        "service_id": EMAILJS_SERVICE_ID,
        "template_id": EMAILJS_TEMPLATE_ID,
        "user_id": EMAILJS_PUBLIC_KEY,
        "template_params": template_params
    }

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AI-Contract-Management-System/1.0"
    }

    try:
        response = requests.post(EMAILJS_API_URL, json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            print(f"[EmailJS] [SUCCESS] Email dispatched successfully to {to_email} (Service: {EMAILJS_SERVICE_ID}, Template: {EMAILJS_TEMPLATE_ID})")
            return {"success": True, "status_code": response.status_code, "message": "Email sent successfully via EmailJS."}
        else:
            print(f"[EmailJS] [WARNING] EmailJS returned status {response.status_code}: {response.text}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
    except Exception as e:
        print(f"[EmailJS] [ERROR] Failed to send email via EmailJS: {e}")
        return {"success": False, "error": str(e)}

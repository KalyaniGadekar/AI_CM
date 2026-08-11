import re
import os
import json
import requests
from datetime import datetime, date
from typing import Optional, Dict

def parse_date(date_str: str) -> Optional[date]:
    """Helper to parse common date formats into a date object."""
    date_str = date_str.strip()
    
    # Replace common separators with standard format
    cleaned_str = re.sub(r'[\s\.\-]+', ' ', date_str)
    
    # Try different format patterns
    formats = [
        # Numeric formats
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y",
        "%Y %m %d", "%d %m %Y", "%m %d %Y",
        # Written formats
        "%B %d %Y", "%b %d %Y", "%d %B %Y", "%d %b %Y",
        "%B %d, %Y", "%b %d, %Y", "%d %B, %Y", "%d %b, %Y",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            try:
                return datetime.strptime(cleaned_str, fmt).date()
            except ValueError:
                continue
                
    # Regex fallback for years
    year_match = re.search(r'\b(19|20)\d{2}\b', date_str)
    if year_match:
        y = int(year_match.group(0))
        # Default to Jan 1st of that year if we can't parse more
        return date(y, 1, 1)

    return None

def load_api_key() -> Optional[str]:
    # Check OS environment first
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key
    
    # Try reading .env file manually to avoid python-dotenv dependency
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
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
                                return v
            except Exception:
                pass
    return None

def extract_metadata_with_gemini(text: str, api_key: str) -> Optional[Dict]:
    """Call Gemini 3.5 Flash model to extract structured metadata."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Send first 8000 and last 4000 characters to capture key clauses
    content_to_send = text[:8000]
    if len(text) > 12000:
        content_to_send += "\n... [TRUNCATED] ...\n" + text[-4000:]
        
    prompt = f"""
You are an expert contract metadata extraction AI. Analyze the contract text below and extract the following metadata fields:
1. `employer_name`: The name of the Employer, Disclosing Party, Company Hiring, or First Party. (Default: "Unknown Employer")
2. `client_name`: The name of the Client, Contractor, Employee, Second Party, or Receiving Party. (Default: "Unknown Client")
3. `company_name`: The primary Company/Business name associated with the contract (typically the employer's company name). (Default: "Unknown Company")
4. `start_date`: The effective date, start date, or commencement date of the contract in YYYY-MM-DD format (or null if not found).
5. `end_date`: The termination, expiration, or end date of the contract in YYYY-MM-DD format (or null if not found).
6. `client_email`: The email address associated with the client, employee, or contractor if found in the text. (null if not found)
7. `summary`: A concise 2-3 sentence summary of the contract's main purpose, scope, and key obligations.

Contract Text:
{content_to_send}
"""
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "employer_name": {"type": "STRING"},
                    "client_name": {"type": "STRING"},
                    "company_name": {"type": "STRING"},
                    "start_date": {"type": "STRING", "description": "YYYY-MM-DD format or null"},
                    "end_date": {"type": "STRING", "description": "YYYY-MM-DD format or null"},
                    "client_email": {"type": "STRING", "description": "Email address of the client/contractor/second party if found, or null"},
                    "summary": {"type": "STRING", "description": "A concise 2-3 sentence summary of the contract's main terms, goals, and obligations."}
                },
                "required": ["employer_name", "client_name", "company_name"]
            }
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            res_data = response.json()
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            extracted = json.loads(raw_text)
            
            result = {
                "employer_name": extracted.get("employer_name", "Unknown Employer") or "Unknown Employer",
                "client_name": extracted.get("client_name", "Unknown Client") or "Unknown Client",
                "company_name": extracted.get("company_name", "Unknown Company") or "Unknown Company",
                "start_date": None,
                "end_date": None,
                "client_email": extracted.get("client_email"),
                "summary": extracted.get("summary")
            }
            
            start_str = extracted.get("start_date")
            end_str = extracted.get("end_date")
            
            if start_str and start_str.strip():
                result["start_date"] = parse_date(start_str)
            if end_str and end_str.strip():
                result["end_date"] = parse_date(end_str)
                
            # Default fallbacks if dates are still None
            if not result["start_date"]:
                result["start_date"] = date.today()
            if not result["end_date"]:
                result["end_date"] = result["start_date"].replace(year=result["start_date"].year + 1)
                
            return result
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        
    return None

def extract_metadata_from_text(text: str) -> Dict:
    """
    Extract metadata (Employer, Client, Company, Agreement Date, Start Date, End Date) from text.
    First tries to call Gemini API if key is available. Falls back to Regex extraction.
    """
    api_key = load_api_key()
    if api_key:
        print(f"GEMINI_API_KEY found. Attempting extraction using Gemini 3.5 Flash...")
        llm_metadata = extract_metadata_with_gemini(text, api_key)
        if llm_metadata:
            print("Gemini metadata extraction successful.")
            return llm_metadata
        else:
            print("Gemini metadata extraction failed. Falling back to Regex extraction...")
    else:
        print("GEMINI_API_KEY not found. Falling back to Regex extraction...")

    metadata = {
        "employer_name": "Unknown Employer",
        "client_name": "Unknown Client",
        "company_name": "Unknown Company",
        "start_date": None,
        "end_date": None,
        "client_email": None,
        "summary": None
    }
    
    if not text:
        # Fallback default dates
        metadata["start_date"] = date.today()
        metadata["end_date"] = metadata["start_date"].replace(year=metadata["start_date"].year + 1)
        return metadata

    # 1. DATE EXTRACTION
    # Try explicit date patterns in text first
    eff_match = re.search(r'(?:effective|start|commencement)\s*date[:\s]+([^\n\r]+)', text, re.IGNORECASE)
    exp_match = re.search(r'(?:expiry|expiration|termination|end)\s*date[:\s]+([^\n\r]+)', text, re.IGNORECASE)
    
    if eff_match:
        metadata["start_date"] = parse_date(eff_match.group(1))
    if exp_match:
        metadata["end_date"] = parse_date(exp_match.group(1))

    # Standard scanning fallback for any missing dates
    date_patterns = [
        # YYYY-MM-DD
        r'\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b',
        # DD/MM/YYYY or MM/DD/YYYY
        r'\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b',
        # Month DD, YYYY
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}\b',
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}\b',
        # DD Month YYYY
        r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b',
        r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b',
    ]
    
    if not metadata["start_date"] or not metadata["end_date"]:
        found_dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                # Clean ordinal suffixes (1st, 2nd, 3rd, etc.) which break datetime.strptime
                cleaned_m = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', m)
                parsed = parse_date(cleaned_m)
                if parsed and parsed not in found_dates:
                    found_dates.append(parsed)
                    
        if found_dates:
            found_dates.sort()
            if not metadata["start_date"]:
                metadata["start_date"] = found_dates[0]
            if not metadata["end_date"]:
                if len(found_dates) > 1:
                    metadata["end_date"] = found_dates[-1]
                else:
                    metadata["end_date"] = found_dates[0].replace(year=found_dates[0].year + 1)

    # Defaults if still None
    if not metadata["start_date"]:
        metadata["start_date"] = date.today()
    if not metadata["end_date"]:
        metadata["end_date"] = metadata["start_date"].replace(year=metadata["start_date"].year + 1)

    # 2. PARTY AND COMPANY NAME EXTRACTION
    # Try structured document style first (e.g. Service Provider / Client / Employer Name)
    sp_match = re.search(r'Service Provider\s+([A-Z][A-Za-z0-9\s,\.&-]+?)(?:\s+Registered|\s+Head|\s+Authorized|\s*AND|\s*2\.|\s*$)', text)
    cl_match = re.search(r'Client\s+([A-Z][A-Za-z0-9\s,\.&-]+?)(?:\s+Registered|\s+Corporate|\s+Authorized|\s+Employer|\s*AND|\s*Service|\s*2\.|\s*$)', text)
    emp_name_match = re.search(r'Employer Name\s+([A-Z][A-Za-z0-9\s,\.&-]+?)(?:\s+Registered|\s+Corporate|\s+Authorized|\s*AND|\s*2\.|\s*$)', text)
    
    if sp_match:
        metadata["employer_name"] = sp_match.group(1).strip()
    if cl_match:
        metadata["client_name"] = cl_match.group(1).strip()
    if emp_name_match:
        metadata["employer_name"] = emp_name_match.group(1).strip()

    # Robust multi-line search fallback on entire text
    if metadata["employer_name"] == "Unknown Employer":
        emp_patterns = [
            r'Employer\s*(?:Name)?\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Service\s+Provider\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Disclosing\s+Party\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'First\s+Party\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)'
        ]
        for pat in emp_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                extracted = m.group(1).strip()
                if not any(w in extracted.lower() for w in ["the", "this", "herein", "effective", "agreement"]):
                    metadata["employer_name"] = extracted
                    break

    if metadata["client_name"] == "Unknown Client":
        cl_patterns = [
            r'Client\s*(?:Name)?\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Contractor\s*(?:Name)?\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Receiving\s+Party\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Second\s+Party\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)',
            r'Employee\s*(?:Name)?\s*[:\-\–\—\s]+\s*([A-Z][A-Za-z0-9,\.& -]+)'
        ]
        for pat in cl_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                extracted = m.group(1).strip()
                if not any(w in extracted.lower() for w in ["the", "this", "herein", "effective", "agreement"]):
                    metadata["client_name"] = extracted
                    break

    # Line-by-line fallback scanning if still unknown (scanning entire text)
    if metadata["employer_name"] == "Unknown Employer" or metadata["client_name"] == "Unknown Client":
        lines = text.split('\n')
        
        employer_patterns = [
            r'Employer Name\s+([A-Z][A-Za-z0-9\s,\.&-]+)',
            r'Service Provider\s+([A-Z][A-Za-z0-9\s,\.&-]+)',
            r'(?:employer|company|disclosing party|first party|represented by)[:\s\-\–\—\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
            r'between\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})'
        ]
        client_patterns = [
            r'Client\s+([A-Z][A-Za-z0-9\s,\.&-]+?)(?:\s+Employer|\s+Registered|\s+Corporate|\s+Authorized|\s*AND|\s*Service|\s*2\.|\s*$)',
            r'(?:client|customer|receiving party|second party|referred to as)[:\s\-\–\—\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
            r'and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})'
        ]

        for line in lines:
            line = line.strip()
            # Find Employer
            if metadata["employer_name"] == "Unknown Employer":
                for pat in employer_patterns:
                    m = re.search(pat, line, re.IGNORECASE)
                    if m:
                        extracted = m.group(1).strip()
                        if not any(w in extracted.lower() for w in ["the", "this", "herein", "effective", "agreement"]):
                            metadata["employer_name"] = extracted
                            break
            
            # Find Client
            if metadata["client_name"] == "Unknown Client":
                for pat in client_patterns:
                    m = re.search(pat, line, re.IGNORECASE)
                    if m:
                        extracted = m.group(1).strip()
                        if extracted != metadata["employer_name"] and not any(w in extracted.lower() for w in ["the", "this", "herein", "agreement"]):
                            metadata["client_name"] = extracted
                            break

    # Clean up names to prevent multi-line matching issues
    for key in ["employer_name", "client_name"]:
        if metadata[key] and isinstance(metadata[key], str):
            lines = [l.strip() for l in metadata[key].split('\n') if l.strip()]
            if lines:
                metadata[key] = lines[0]

    # Extract company name (typically the employer/service provider company)
    company_patterns = [
        r'\b([A-Z][A-Za-z0-9\s,\.&-]+\s+(?:Inc|LLC|Ltd|Co|Corporation|Incorporated|Limited|Pvt\.\s*Ltd\.|Private\s+Limited))\b'
    ]
    for line in text.split('\n'):
        if metadata["company_name"] == "Unknown Company":
            for pat in company_patterns:
                m = re.search(pat, line)
                if m:
                    metadata["company_name"] = m.group(1).strip()
                    break

    # Tidy up company fallbacks
    if metadata["company_name"] == "Unknown Company":
        if metadata["employer_name"] != "Unknown Employer":
            metadata["company_name"] = metadata["employer_name"]
        elif metadata["client_name"] != "Unknown Client":
            metadata["company_name"] = metadata["client_name"]

    # 3. Client Email Heuristic Extraction
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    if emails:
        # Avoid picking the system or generic email if possible, just pick the first
        metadata["client_email"] = emails[0]

    # 4. Core Summary Heuristic Fallback
    employer = metadata["employer_name"]
    client = metadata["client_name"]
    company = metadata["company_name"]
    start = metadata["start_date"] or date.today()
    end = metadata["end_date"] or (start.replace(year=start.year + 1) if isinstance(start, date) else date.today().replace(year=date.today().year + 1))
    
    fallback_summary = f"Contract agreement between Disclosing Party/Employer '{employer}' and Receiving Party/Client '{client}' (representing '{company}'), valid from {start} to {end}."
    metadata["summary"] = fallback_summary

    return metadata

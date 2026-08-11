# 🚀 Technologies Used in AI Contract Management System

This document provides a comprehensive overview of all technologies, frameworks, libraries, databases, AI/NLP models, and tools used across the entire **AI Contract Management System**.

---

## 📑 Table of Contents
- [1. Frontend Stack](#1-frontend-stack)
- [2. Backend Stack](#2-backend-stack)
- [3. Artificial Intelligence, NLP & Search](#3-artificial-intelligence-nlp--search)
- [4. Database & Storage](#4-database--storage)
- [5. Authentication & Security](#5-authentication--security)
- [6. Development, Tooling & Scripts](#6-development-tooling--scripts)
- [7. System Architecture Overview](#7-system-architecture-overview)

---

## 1. Frontend Stack

| Technology / Library | Version / Tool | Purpose & Usage |
| :--- | :--- | :--- |
| **React** | `^19.2.8` | Core UI library for building reactive, component-driven Single Page Applications (SPA). |
| **TypeScript** | `~6.0.2` | Strongly-typed JavaScript providing static type checking and interface contracts across components. |
| **Vite** | `^8.2.0` | Next-generation frontend build tool and development server featuring blazing fast Hot Module Replacement (HMR). |
| **@vitejs/plugin-react** | `^6.0.4` | Vite plugin for React integration and JSX compilation using Oxc. |
| **Lucide React** | `^1.28.0` | Modern, customizable icon library used throughout navigation, KPI metrics, buttons, and alert states. |
| **Oxlint** | `^1.75.0` | High-performance linter for JavaScript and TypeScript code quality and standards enforcement. |
| **Vanilla CSS3** | Custom | Bespoke glassmorphism design system, dark/light theme tokens, responsive layouts, flexbox/grid, and micro-animations. |

### Key Frontend Components & Views
- `DashboardLayout.tsx`: Main navigation wrapper, sidebar, dynamic KPI header bar, and user profile management.
- `UploadDashboard.tsx`: Document upload dropzone, smart extraction preview, real-time KPI metrics, search filtering, and table grid.
- `FillDashboard.tsx`: Manual contract entry form with date pickers, validation, and real-time summary generation.
- `AlertsDashboard.tsx`: Expiration tracking view (active, expiring in $\le$ 5 days, expired) and manual/automated notification dispatch.
- `AuditLogsDashboard.tsx`: Full audit trail viewer with action types, details, and timestamps.
- `Login.tsx` / `Register.tsx` / `ForgotPassword.tsx`: Authentication flows with JWT session handling and password reset code generation.

---

## 2. Backend Stack

| Technology / Library | Version / Package | Purpose & Usage |
| :--- | :--- | :--- |
| **Python** | `3.10+` | Core programming language powering the backend services, NLP, and data processing pipelines. |
| **FastAPI** | `>=0.100.0` | Modern, high-performance asynchronous web framework for building RESTful APIs with OpenAPI/Swagger documentation. |
| **Uvicorn** | `>=0.22.0` | Lightning-fast ASGI web server implementation used to serve the FastAPI application. |
| **Pydantic v2** | Integrated | Data validation, request payload parsing, and response serialization schemas (`schemas.py`). |
| **SQLAlchemy** | `>=2.0.0` | Object Relational Mapper (ORM) for SQL database modeling, relations, queries, and migrations (`models.py`). |
| **python-multipart** | `>=0.0.6` | Multipart form-data streaming parser for handling PDF and DOCX file uploads via HTTP. |
| **Requests** | `>=2.31.0` | HTTP client library used for external REST communication (Google Gemini API integration). |
| **PyPDF** | `>=3.9.0` | Pure-Python PDF extraction library used to extract text and structure from uploaded PDF documents. |
| **PyJWT** | `>=2.8.0` | JSON Web Token implementation for encoding, signing, and verifying user authentication tokens. |
| **psycopg2-binary** | `>=2.9.0` | Production-grade PostgreSQL database adapter for Python / SQLAlchemy. |
| **MinIO Python SDK**| `>=7.2.0` | Amazon S3 compatible client SDK used to store, stream, retrieve, and delete contract files. |
| **blake3** | `>=1.0.0` | High-performance cryptographic tree-hashing library for ultra-fast byte-level contract duplicate detection. |

---

## 3. Artificial Intelligence, NLP & Search

| Area | Technology / Algorithm | Details & Implementation |
| :--- | :--- | :--- |
| **Generative AI / LLM** | **Google Gemini 3.5 Flash** | Used for automated contract metadata extraction (`employer_name`, `client_name`, `company_name`, `start_date`, `end_date`, `client_email`, `summary`) with structured JSON schema responses. |
| **Retrieval-Augmented Generation (RAG)** | **Gemini Prompt-based RAG** | Question-answering pipeline that extracts contract clauses and generates contextual answers to natural language questions. |
| **Keyword Search** | **BM25 Algorithm** | Full custom implementation of the Okapi BM25 probabilistic relevance algorithm ($k_1=1.5, b=0.75$) with inverse document frequency smoothing. |
| **Semantic Search** | **TF-IDF & Cosine Similarity** | Term frequency-inverse document frequency vectorizer and sparse vector cosine similarity ranking. |
| **Query Intent Classification** | **Rule/Heuristic Classifier** | Automatically classifies incoming search queries into `METADATA`, `KEYWORD`, or `RAG` intent for targeted execution. |
| **Rule-Based Metadata Extraction** | **Regex Fallback Parser** | Multi-pattern regex extraction for party names, multi-format date parsers (ISO, European, American, written formats), and email extraction. |
| **DOCX Text Extraction** | **XML Parsing (`xml.etree.ElementTree` & `zipfile`)** | Extracts paragraph text directly from Word Open XML (`word/document.xml`) without heavy external binary dependencies. |
| **PDF Text Extraction** | **PyPDF Engine** | Page-by-page text extraction pipeline with error tolerance. |
| **Duplicate Detection** | **Cryptographic BLAKE3** | Multi-threaded cryptographic tree hashing (`blake3`) to reject duplicate file uploads with maximum speed and collision resistance. |


---

## 4. Database & Storage

| Technology | Type | Configuration & Purpose |
| :--- | :--- | :--- |
| **PostgreSQL** | Primary Relational Database | Enterprise SQL database (`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/contracts_db`) with connection pooling and pre-ping checks. |
| **SQLite 3** | Automatic Fallback Database | Zero-configuration local database (`contracts.db`) that activates automatically if PostgreSQL is unreachable or offline. |
| **MinIO** | S3-Compatible Object Store | High-performance object storage server (`minio.exe` / `minio_data` directory, bucket `contracts`) for contract PDFs and DOCX files. |
| **Database Tables** | Relational Models | - `users`: User credentials, company names, hashed passwords, reset tokens.<br>- `contracts`: File hashes, extracted metadata, S3 paths, text contents, expiry states.<br>- `audit_logs`: Immutable timestamped audit trails of all system operations. |


---

## 5. Authentication & Security

| Feature | Technology / Standard | Implementation Details |
| :--- | :--- | :--- |
| **Token Authentication** | **JWT (JSON Web Tokens)** | Bearer token authentication via FastAPI `HTTPBearer` with 24-hour expiration (`HS256` signature). |
| **Password Hashing** | **PBKDF2 HMAC SHA-256** | 100,000 hash iterations with a 16-byte random cryptographic salt per user. |
| **Password Reset** | **Cryptographic Token** | Secure reset token generation via `secrets.token_hex` for account recovery. |
| **CORS Middleware** | **FastAPI CORS** | Configured cross-origin resource sharing for seamless frontend-backend communication. |
| **Audit Logging** | **Custom Audit Trail** | Tracks user actions (Logins, Uploads, Duplicate Rejections, Searches, Notification Dispatches). |
| **Email Notifications** | **EmailJS REST API** | Automated & manual contract expiration email notifications dispatched directly to client email addresses via configured service and template. |

---

## 6. Development, Tooling & Scripts

| Tool / Script | Purpose |
| :--- | :--- |
| **Node.js & npm** | JavaScript runtime environment and package manager for frontend dependencies. |
| **Python Virtual Environment (`venv`)** | Isolated Python environment for backend dependencies. |
| **`start_backend.bat`** | Windows batch script to launch the FastAPI backend server on `http://127.0.0.1:8000`. |
| **`start_frontend.bat`** | Windows batch script to launch the Vite development server on `http://localhost:5173`. |
| **`migrate_to_minio.py`** | Automated migration script to migrate legacy local filesystem uploads into the MinIO S3 bucket. |
| **`migrate_db.py`** | Database schema updater for new column additions and SQLite table migrations. |

---

## 7. System Architecture Overview

```mermaid
graph TD
    User([User / Browser]) <-->|React 19 + TypeScript + Vite| Frontend[Frontend SPA - Port 5173]
    Frontend <-->|REST API + JWT Bearer Auth| Backend[FastAPI Backend - Port 8000]
    
    subgraph Backend Services
        Auth[JWT & PBKDF2 Auth]
        NLP[NLP & Query Router]
        Extractor[Metadata Extractor]
        RAG[RAG QA Engine]
        StorageMgr[MinIO Storage Manager]
    end

    Backend --> Auth
    Backend --> NLP
    Backend --> Extractor
    Backend --> RAG
    Backend --> StorageMgr

    Extractor -->|Structured JSON Extraction| Gemini[Google Gemini 3.5 Flash API]
    RAG -->|Contract Context Question Answering| Gemini

    StorageMgr <-->|S3 API| MinIO[(MinIO Object Store - Port 9000)]
    Backend <-->|SQLAlchemy ORM| SQLite[(SQLite Database - contracts.db)]
```

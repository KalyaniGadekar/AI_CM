import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("database")

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

# Get configured database URL (default to PostgreSQL)
CONFIGURED_DB_URL = load_env_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/contracts_db").strip()

# Normalize legacy postgres:// scheme to postgresql://
if CONFIGURED_DB_URL.startswith("postgres://"):
    CONFIGURED_DB_URL = "postgresql" + CONFIGURED_DB_URL[8:]

SQLITE_FALLBACK_URL = "sqlite:///./contracts.db"

ACTIVE_DB_TYPE = "sqlite"
DB_STATUS = "initialized"
FALLBACK_REASON = None
engine = None

def init_database_engine():
    global ACTIVE_DB_TYPE, DB_STATUS, FALLBACK_REASON, engine
    
    is_postgres = CONFIGURED_DB_URL.startswith("postgresql")
    
    if is_postgres:
        try:
            print(f"[Database] Attempting connection to PostgreSQL: {CONFIGURED_DB_URL.split('@')[-1] if '@' in CONFIGURED_DB_URL else CONFIGURED_DB_URL}...")
            # Try connecting to PostgreSQL with pool_pre_ping and connection timeout
            test_engine = create_engine(
                CONFIGURED_DB_URL,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                connect_args={"connect_timeout": 3} if "psycopg" in CONFIGURED_DB_URL or "postgresql" in CONFIGURED_DB_URL else {}
            )
            # Verify connectivity
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            engine = test_engine
            ACTIVE_DB_TYPE = "postgresql"
            DB_STATUS = "connected"
            FALLBACK_REASON = None
            print("[Database] [SUCCESS] Connected successfully to PostgreSQL database.")
            return engine
        except Exception as e:
            FALLBACK_REASON = str(e)
            print(f"[Database] [WARNING] PostgreSQL connection failed: {e}")
            print(f"[Database] [FALLBACK] Automatically switching to SQLite fallback database: contracts.db")
            ACTIVE_DB_TYPE = "sqlite_fallback"
            DB_STATUS = "fallback"
    
    # Fallback / Default to SQLite
    engine = create_engine(
        SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    if ACTIVE_DB_TYPE != "sqlite_fallback":
        ACTIVE_DB_TYPE = "sqlite"
        DB_STATUS = "connected"
    print(f"[Database] Using SQLite database ({SQLITE_FALLBACK_URL}).")
    return engine

# Initialize the engine
engine = init_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_info() -> dict:
    """Returns metadata regarding active database connection."""
    return {
        "active_db_type": ACTIVE_DB_TYPE,
        "status": DB_STATUS,
        "is_fallback": ACTIVE_DB_TYPE == "sqlite_fallback",
        "url_scheme": engine.url.drivername if engine else "unknown",
        "configured_url": (CONFIGURED_DB_URL.split('@')[-1] if '@' in CONFIGURED_DB_URL else CONFIGURED_DB_URL) if CONFIGURED_DB_URL else "",
        "fallback_reason": FALLBACK_REASON
    }


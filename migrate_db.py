import sqlite3
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

def run_migration_for_sqlite_file(db_name: str):
    if not os.path.exists(db_name):
        print(f"SQLite file {db_name} does not exist. Skipping.")
        return

    print(f"Migrating SQLite file: {db_name}")
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Get existing columns
    try:
        cursor.execute("PRAGMA table_info(contracts)")
        columns = [row[1] for row in cursor.fetchall()]
        if not columns:
            print(f"  contracts table not found in {db_name}. Skipping.")
            conn.close()
            return
    except Exception as e:
        print(f"  Error reading contracts table in {db_name}: {e}. Skipping.")
        conn.close()
        return

    # Add client_email if not exists
    if "client_email" not in columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN client_email TEXT")
        print("  Added client_email column.")
    else:
        print("  client_email column already exists.")

    # Add summary if not exists
    if "summary" not in columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN summary TEXT")
        print("  Added summary column.")
    else:
        print("  summary column already exists.")

    # Add notification_status if not exists
    if "notification_status" not in columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN notification_status BOOLEAN DEFAULT 0")
        print("  Added notification_status column.")
    else:
        print("  notification_status column already exists.")

    # Add notification_sent_at if not exists
    if "notification_sent_at" not in columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN notification_sent_at TIMESTAMP")
        print("  Added notification_sent_at column.")
    else:
        print("  notification_sent_at column already exists.")

    conn.commit()
    conn.close()
    print(f"Migration completed for {db_name}.\n")

def run_migration_for_active_db():
    try:
        from app.database import engine, Base, get_db_info
        info = get_db_info()
        print(f"Active configured database: {info['active_db_type']} (Status: {info['status']})")
        print("Ensuring all tables are created in the active database...")
        Base.metadata.create_all(bind=engine)
        print("Active database schema verified successfully.\n")
    except Exception as e:
        print(f"Error checking active database: {e}\n")

if __name__ == "__main__":
    print("=" * 60)
    print("Running Database Migrations (PostgreSQL & SQLite)")
    print("=" * 60)
    run_migration_for_active_db()
    
    # Also check local SQLite files
    run_migration_for_sqlite_file("contracts.db")
    run_migration_for_sqlite_file("test_contracts.db")
    run_migration_for_sqlite_file("test_hybrid.db")
    run_migration_for_sqlite_file("backend/contracts.db")
    run_migration_for_sqlite_file("backend/test_contracts.db")
    run_migration_for_sqlite_file("backend/test_hybrid.db")


#!/usr/bin/env python3
"""Script to manually fix database issues."""

import sqlite3
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

def fix_database():
    db_path = "/Users/henriquepmachado/Documents/Python_projetos/backend/combine.db"
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    print("Connecting to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if athlete_status column exists
        cursor.execute("PRAGMA table_info(user)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"User table columns: {columns}")
        
        if 'athlete_status' not in columns:
            print("Adding athlete_status column...")
            cursor.execute("ALTER TABLE user ADD COLUMN athlete_status VARCHAR(20) DEFAULT 'INCOMPLETE'")
        
        if 'rejection_reason' not in columns:
            print("Adding rejection_reason column...")
            cursor.execute("ALTER TABLE user ADD COLUMN rejection_reason TEXT")
        
        # Fix existing values
        print("Fixing existing athlete_status values...")
        cursor.execute("UPDATE user SET athlete_status = 'APPROVED' WHERE role != 'athlete' AND (athlete_status IS NULL OR athlete_status = '' OR athlete_status = 'incomplete')")
        cursor.execute("UPDATE user SET athlete_status = 'INCOMPLETE' WHERE role = 'athlete' AND (athlete_status IS NULL OR athlete_status = '' OR athlete_status = 'incomplete')")
        cursor.execute("UPDATE user SET athlete_status = 'PENDING' WHERE athlete_status = 'pending'")
        cursor.execute("UPDATE user SET athlete_status = 'APPROVED' WHERE athlete_status = 'approved'")
        cursor.execute("UPDATE user SET athlete_status = 'REJECTED' WHERE athlete_status = 'rejected'")
        
        conn.commit()
        
        # Verify the fix
        cursor.execute("SELECT role, athlete_status, COUNT(*) FROM user GROUP BY role, athlete_status")
        results = cursor.fetchall()
        print("\nUser status distribution:")
        for role, status, count in results:
            print(f"  {role}: {status} = {count} users")
        
        print("Database fixed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()

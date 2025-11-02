#!/usr/bin/env python3
"""Script to check and fix database enum values."""

import sys
import os
import sqlite3

# Path to the database
db_path = "/Users/henriquepmachado/Documents/Python_projetos/backend/combine.db"

def check_and_fix_db():
    print("Checking database...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current values in athlete_status column
        cursor.execute("SELECT athlete_status, COUNT(*) FROM user GROUP BY athlete_status")
        results = cursor.fetchall()
        print("Current athlete_status values:")
        for status, count in results:
            print(f"  {status}: {count} users")
        
        # Fix the values
        print("\nFixing enum values...")
        cursor.execute("UPDATE user SET athlete_status = 'INCOMPLETE' WHERE athlete_status IN ('incomplete', 'INCOMPLETE') OR athlete_status IS NULL")
        cursor.execute("UPDATE user SET athlete_status = 'PENDING' WHERE athlete_status = 'pending'")
        cursor.execute("UPDATE user SET athlete_status = 'APPROVED' WHERE athlete_status = 'approved'")
        cursor.execute("UPDATE user SET athlete_status = 'REJECTED' WHERE athlete_status = 'rejected'")
        
        conn.commit()
        
        # Check after fix
        cursor.execute("SELECT athlete_status, COUNT(*) FROM user GROUP BY athlete_status")
        results = cursor.fetchall()
        print("\nAfter fixing:")
        for status, count in results:
            print(f"  {status}: {count} users")
            
        print("Database fixed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    check_and_fix_db()

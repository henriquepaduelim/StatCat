#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('combine.db')
cursor = conn.cursor()

# Check athlete 30
print("\n=== Checking Athlete 30 ===")
cursor.execute("""
    SELECT 
        a.id as athlete_id,
        a.first_name,
        a.last_name,
        a.email as athlete_email,
        u.id as user_id,
        u.email as user_email,
        u.athlete_status
    FROM athlete a
    LEFT JOIN user u ON u.athlete_id = a.id
    WHERE a.id = 30
""")
result = cursor.fetchone()

if result:
    print(f"Athlete ID: {result[0]}")
    print(f"Name: {result[1]} {result[2]}")
    print(f"Athlete Email: {result[3]}")
    print(f"User ID: {result[4]}")
    print(f"User Email: {result[5]}")
    print(f"Status: {result[6]}")
    
    if result[4] is None:
        print("\n⚠️  PROBLEM: This athlete has NO USER ACCOUNT!")
        print("Solution: Create a user account for this athlete first.")
else:
    print("Athlete 30 not found in database")

# Show all athletes without users
print("\n=== All Athletes Without User Accounts ===")
cursor.execute("""
    SELECT 
        a.id,
        a.first_name,
        a.last_name,
        a.email
    FROM athlete a
    LEFT JOIN user u ON u.athlete_id = a.id
    WHERE u.id IS NULL
    ORDER BY a.id
    LIMIT 10
""")

athletes_no_user = cursor.fetchall()
if athletes_no_user:
    print(f"\nFound {len(athletes_no_user)} athletes without user accounts:")
    for athlete in athletes_no_user:
        print(f"  - ID {athlete[0]}: {athlete[1]} {athlete[2]} ({athlete[3]})")
else:
    print("All athletes have user accounts!")

conn.close()

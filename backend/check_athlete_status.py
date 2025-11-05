#!/usr/bin/env python3
import sqlite3
import sys

athlete_id = 41 if len(sys.argv) < 2 else int(sys.argv[1])

conn = sqlite3.connect('combine.db')
cursor = conn.cursor()

query = """
SELECT 
    a.id as athlete_id,
    a.first_name,
    a.last_name,
    u.id as user_id,
    u.athlete_status
FROM athlete a
LEFT JOIN user u ON u.athlete_id = a.id
WHERE a.id = ?
"""

cursor.execute(query, (athlete_id,))
result = cursor.fetchone()

if result:
    print(f"\nAthlete ID: {result[0]}")
    print(f"Name: {result[1]} {result[2]}")
    print(f"User ID: {result[3]}")
    print(f"Status: {result[4]}")
else:
    print(f"Athlete {athlete_id} not found")

conn.close()

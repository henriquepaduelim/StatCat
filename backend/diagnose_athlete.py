#!/usr/bin/env python3
"""
Check athlete 30 status and diagnose the approval/rejection issue
"""

import sqlite3


def check_athlete(athlete_id=30):
    conn = sqlite3.connect("combine.db")
    cursor = conn.cursor()

    print(f"\n{'=' * 60}")
    print(f"DIAGNOSTIC REPORT FOR ATHLETE {athlete_id}")
    print(f"{'=' * 60}\n")

    # Check athlete exists
    cursor.execute(
        "SELECT id, first_name, last_name, email FROM athlete WHERE id = ?",
        (athlete_id,),
    )
    athlete = cursor.fetchone()

    if not athlete:
        print(f"❌ ATHLETE {athlete_id} NOT FOUND IN DATABASE")
        conn.close()
        return

    print(f"✅ Athlete Found:")
    print(f"   ID: {athlete[0]}")
    print(f"   Name: {athlete[1]} {athlete[2]}")
    print(f"   Email: {athlete[3] or '(none)'}")

    # Check user account
    cursor.execute(
        """
        SELECT id, email, athlete_status, rejection_reason
        FROM user 
        WHERE athlete_id = ?
    """,
        (athlete_id,),
    )
    user = cursor.fetchone()

    print(f"\n{'=' * 60}")
    if not user:
        print("❌ NO USER ACCOUNT LINKED")
        print("\n💡 SOLUTION:")
        print("   The backend should auto-create user when you approve/reject.")
        print("   If backend was restarted, try approve/reject again.")
    else:
        print(f"✅ User Account Found:")
        print(f"   User ID: {user[0]}")
        print(f"   Email: {user[1]}")
        print(f"   Status: {user[2]}")
        print(f"   Rejection Reason: {user[3] or '(none)'}")

        # Check if status allows approval/rejection
        status = user[2]
        print(f"\n{'=' * 60}")
        print("STATUS ANALYSIS:")

        if status == "APPROVED":
            print("   ✅ Can approve again (idempotent - will just return success)")
            print("   ❌ Cannot reject (status is APPROVED)")
            print("\n💡 TO REJECT:")
            print("   First reset status to INCOMPLETE:")
            print(
                f"   UPDATE user SET athlete_status = 'INCOMPLETE' WHERE athlete_id = {athlete_id};"
            )

        elif status == "REJECTED":
            print("   ❌ Cannot approve (status is REJECTED)")
            print("   ❌ Cannot reject (already rejected)")
            print("\n💡 TO APPROVE OR REJECT AGAIN:")
            print("   First reset status to INCOMPLETE:")
            print(
                f"   UPDATE user SET athlete_status = 'INCOMPLETE' WHERE athlete_id = {athlete_id};"
            )

        elif status in ["INCOMPLETE", "PENDING"]:
            print(f"   ✅ Can approve ({status} → APPROVED)")
            print(f"   ✅ Can reject ({status} → REJECTED)")

        else:
            print(f"   ⚠️  Unknown status: {status}")

    print(f"\n{'=' * 60}")
    print("BACKEND REQUIREMENTS:")
    print("   - Backend must be restarted to load new code")
    print("   - Check backend terminal for error messages")
    print("   - Look for 'INFO: Created user account' or 'DEBUG approve_athlete'")

    conn.close()


if __name__ == "__main__":
    check_athlete(30)

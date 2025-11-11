#!/usr/bin/env python3

import smtplib
import getpass

def manual_smtp_test():
    """Test SMTP with manual input"""
    
    print("🔧 Manual SMTP Test")
    print("This will test your Gmail credentials directly")
    print()
    
    email = input("Enter your Gmail address: ").strip()
    password = getpass.getpass("Enter your App Password (hidden): ").strip()
    
    print(f"\nTesting connection to Gmail with {email}...")
    
    try:
        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        
        print("Attempting authentication...")
        server.login(email, password)
        
        print("✅ SUCCESS: Authentication successful!")
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ AUTH ERROR: {e}")
        print("\nPossible solutions:")
        print("1. Make sure 2-factor authentication is enabled")
        print("2. Generate new App Password at https://myaccount.google.com/apppasswords")
        print("3. Use the 16-character password (not your regular Gmail password)")
        return False
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    success = manual_smtp_test()
    if success:
        print("\n🎉 Your Gmail SMTP credentials are working!")
        print("Now update the .env file with the working credentials.")
    else:
        print("\n🔧 Fix the credentials and try again.")
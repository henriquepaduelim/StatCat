#!/usr/bin/env python3

import os
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pytest
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp():
    """Test SMTP configuration"""
    
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    from_email = os.getenv('SMTP_FROM_EMAIL', smtp_user)
    
    print(f"Testing SMTP configuration...")
    print(f"Host: {smtp_host}")
    print(f"Port: {smtp_port}")
    print(f"User: {smtp_user}")
    print(f"From: {from_email}")
    
    if not smtp_user or not smtp_password:
        pytest.skip("SMTP credentials not configured in environment variables.")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = smtp_user  # Send to yourself for testing
        msg['Subject'] = "StatCat SMTP Test"
        
        body = """
        This is a test email from StatCat backend.
        
        If you receive this, your SMTP configuration is working correctly!
        
        Configuration tested:
        - Host: {host}
        - Port: {port}
        - User: {user}
        """.format(host=smtp_host, port=smtp_port, user=smtp_user)
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect and send
        print("Connecting to SMTP server...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        
        print("Authenticating...")
        server.login(smtp_user, smtp_password)
        
        print("Sending test email...")
        server.send_message(msg)
        server.quit()
        
        print("✅ SUCCESS: Test email sent successfully!")
        print(f"📧 Check your inbox: {smtp_user}")
        
    except smtplib.SMTPAuthenticationError as exc:
        pytest.fail(f"SMTP authentication failed: {exc}")
        
    except smtplib.SMTPConnectError as exc:
        pytest.fail(f"SMTP connection failed: {exc}")

    except (socket.gaierror, OSError) as exc:
        pytest.skip(f"SMTP host unavailable in current environment: {exc}")

    except Exception as exc:
        pytest.fail(f"Unexpected SMTP error: {exc}")

if __name__ == "__main__":
    print("🧪 StatCat SMTP Test")
    print("=" * 40)
    success = test_smtp()
    print("=" * 40)
    if success:
        print("🎉 SMTP is working! You can now test event notifications.")
    else:
        print("🔧 Fix the SMTP configuration and try again.")

#!/bin/bash

git add frontend/src/pages/Dashboard.tsx
git add backend/app/api/v1/endpoints/teams.py  
git add frontend/src/api/teams.ts
git add backend/.env.example

git commit -m "Phase 1: Core functionality improvements

- Fixed syntax error in Dashboard.tsx
- Added analytics metrics to dashboard 
- Improved mobile responsiveness for event modal
- Enhanced team management with coach assignment
- Updated email configuration template"

echo "✅ Phase 1 changes committed successfully"
echo ""
echo "📧 NEXT STEPS FOR EMAIL SETUP:"
echo "1. Go to https://myaccount.google.com/apppasswords"
echo "2. Create app password for StatCat"
echo "3. Copy .env.example to .env: cp backend/.env.example backend/.env"
echo "4. Edit .env with your Gmail credentials"
echo "5. Restart backend: cd backend && uvicorn app.main:app --reload"
echo ""
echo "🧪 TEST EMAIL NOTIFICATIONS:"
echo "1. Create an event and invite athletes"
echo "2. Check 'Send Email' checkbox"  
echo "3. Verify emails are received"
# Quick Start Guide - Testing the New Onboarding Flow

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+ installed
- Backend running on http://localhost:8000
- Git repository cloned

### Step 1: Prepare Backend (if not running)
```bash
cd /Users/henriquepmachado/Documents/Python_projetos/backend

# Activate virtual environment
source .venv/bin/activate  # or: .venv\Scripts\activate on Windows

# Start backend
uvicorn app.main:app --reload
```

✅ Backend should be running at http://localhost:8000

### Step 2: Start Frontend Development Server
```bash
cd /Users/henriquepmachado/Documents/Python_projetos/frontend

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

✅ Frontend should be running at http://localhost:5173

### Step 3: Open Browser
```
Navigate to: http://localhost:5173
```

---

## 🧪 Quick Test (2 minutes)

### Test 1: Account Registration
1. Click "Create Account" button
2. Fill in:
   - Full Name: `Test Athlete`
   - Email: `test@athlete.local` (unique for each test)
   - Password: `TestPass123!`
3. Click "Create account"

**✅ Expected Result:**
- Page redirects to onboarding with video background
- Title shows "Complete Your Athlete Profile"
- Step 1 form is visible with "Step 1 of 2: Basic athlete information"

### Test 2: Complete Step 1
1. Fill in required fields:
   - First Name: `Test`
   - Last Name: `Athlete`
   - Birth Date: `2000-01-15` (any valid date)
   - Gender: `Male`
   - Email: `test@athlete.local`
   - Phone: `+1234567890`
2. Click "Next Step"

**✅ Expected Result:**
- Form submits successfully
- Page updates to show Step 2
- Title shows "Step 2 of 2: Additional details"

### Test 3: Complete Step 2
1. Fill in key fields:
   - City: `Toronto`
   - Guardian Name: `John Guardian`
   - Guardian Email: `guardian@email.com`
   - Guardian Phone: `+1987654321`
   - Emergency Contact Name: `Jane Doe`
   - Emergency Contact Phone: `+1987654321`
2. Click "Complete Registration"

**✅ Expected Result:**
- Form submits
- Page shows Step 3 (Review & Submit)
- "Registration Complete!" message appears

### Test 4: Submit for Approval
1. Click "Submit for Approval"

**✅ Expected Result:**
- Button shows loading state
- Redirects to "Awaiting Approval" page
- Message shows "Your application is pending review"

---

## 📱 Visual Inspection Checklist

### Video Background
- [ ] Video is visible (football field or similar)
- [ ] Video fills entire screen
- [ ] Dark overlay is visible over video
- [ ] Video loops smoothly
- [ ] Video doesn't interfere with form interaction

### Form Container
- [ ] Container is centered on screen
- [ ] Container has rounded corners
- [ ] Container has slight shadow
- [ ] Container background is semi-transparent
- [ ] Form text is readable on container background

### Mobile View
1. Open DevTools (F12)
2. Click device toolbar icon
3. Select "iPhone SE" (375px width)
4. Reload page

**Check:**
- [ ] No horizontal scrolling
- [ ] Container still visible
- [ ] Form fields are readable
- [ ] Buttons are clickable
- [ ] Video still plays (or loads)

---

## 🔍 Browser DevTools Inspection

### Network Tab
1. Open DevTools (F12)
2. Click "Network" tab
3. Create a new account
4. Watch the network requests

**Expected API Calls (in order):**
1. `POST /auth/register` → 201 (new user)
2. `POST /auth/login` → 200 (auto-login)
3. `GET /athletes?...` → 200 (optional queries)
4. `POST /athletes` → 201 (Step 1 form)
5. `PATCH /athletes/{id}/complete-registration` → 200 (Step 2)
6. `POST /athletes/{id}/submit-approval` → 200 (Step 3)

### Storage Tab
1. Open DevTools
2. Click "Application" or "Storage" tab
3. Expand "Local Storage"
4. Click `http://localhost:5173`

**Check:**
- [ ] `auth-storage` key exists
- [ ] Contains valid JSON with `state.user` and `state.token`
- [ ] User object has `athlete_id` after Step 1
- [ ] User object has `athlete_status: "PENDING"` after submission

### Console Tab
1. Open DevTools
2. Click "Console" tab
3. Perform the test flow

**Check:**
- [ ] No errors (red messages)
- [ ] No warnings (yellow messages)
- [ ] Auth messages show expected flow

---

## 🎨 Visual Comparison Guide

### Login Page Video Background
```
Visit: http://localhost:5173/login
Create account tab
↓
Video should be visible behind login form
```

### Onboarding Page Video Background
```
Auto-redirect after account creation
↓
Video should be identical to login page
Same quality, same video file
```

### Container Styling
```
Both pages should have:
- Rounded rectangle container
- Semi-transparent white/gray background
- Slight shadow effect
- Centered on screen
```

---

## 📊 Debug Information

### If Something Goes Wrong

**Problem: "Loading..." spinner stuck**
```
→ Check: Is backend running? (http://localhost:8000)
→ Check: Console for error messages
→ Check: Network tab for failed API calls
→ Solution: Restart backend and try again
```

**Problem: Video background not showing**
```
→ Check: Backend media folder has login-bg.mp4
→ Check: Network tab - is video loading?
→ Check: Console for errors
→ Solution: Verify /media/login-bg.mp4 exists in backend
```

**Problem: Form submission fails**
```
→ Check: All required fields are filled
→ Check: Network tab for 422 or 400 errors
→ Check: Console for exact error message
→ Solution: See ONBOARDING_TESTING.md troubleshooting
```

**Problem: Auto-login doesn't work**
```
→ Check: Auto-login code in AthleteOnboarding.tsx
→ Check: localStorage has auth-storage
→ Check: Network shows login API call
→ Solution: Check browser console for specific error
```

---

## 🔐 Testing Different Scenarios

### Scenario 1: New User Full Flow
```bash
Email: newuser+$(date +%s)@test.com  # Unique each time
Password: TestPass123!
Result: Should go through all 3 steps successfully
```

### Scenario 2: Rejection & Re-entry (Admin Action)
```
# Admin manually rejects application (need admin access)
→ User sees feedback message in red box
→ Form resets to Step 1
→ User can fix and resubmit
```

### Scenario 3: Edit Existing Registration
```
Step 3 page → Click "Edit Registration"
→ Should go back to Step 2
→ Previous data should be preserved
→ Edit a field and submit
```

### Scenario 4: Mobile On-the-go
```
# Open DevTools → Device Emulation → iPhone SE
→ Register on mobile
→ Complete onboarding on mobile
→ Verify smooth experience
```

---

## 📈 Performance Benchmarks

### Expected Times (on localhost)
- **Page Load**: < 1 second
- **Video Load**: < 2 seconds
- **Auto-Login**: < 1 second
- **Step 1 Form Submit**: < 2 seconds
- **Step 2 Form Submit**: < 2 seconds
- **Submit for Approval**: < 1 second

### If Slower:
1. Check backend performance
2. Check network conditions
3. Check browser console for warnings
4. Profile in Chrome DevTools

---

## 🔄 Test Cycle Checklist

### Before Each Test
- [ ] Backend is running
- [ ] Frontend dev server is running
- [ ] Browser cache is cleared (Ctrl+Shift+Del)
- [ ] DevTools Network tab has "Preserve log" checked

### During Test
- [ ] Watch Network tab
- [ ] Watch Console tab
- [ ] Note any errors or warnings
- [ ] Test on different devices

### After Test
- [ ] Document any issues
- [ ] Take screenshots of problems
- [ ] Note timing/performance
- [ ] Check success/failure rate

---

## 📸 Screenshots to Take

For documentation, capture:

1. **Login Create Account Form**
   - Showing registration fields

2. **Onboarding Step 1**
   - Video background visible
   - Form with basic info

3. **Onboarding Step 2**
   - Address and guardian sections
   - Scrollable form

4. **Onboarding Step 3**
   - Review page with "Submit for Approval" button

5. **Awaiting Approval**
   - Success message after submission

6. **Mobile View**
   - Step 1 on iPhone SE (375px width)
   - Form fields stacked vertically

---

## 🚨 Error Codes & Solutions

### 401 Unauthorized
```
Cause: Token expired or invalid
Solution: Clear localStorage and login again
```

### 422 Validation Error
```
Cause: Form data doesn't match expected format
Solution: Check required fields are filled
```

### 500 Server Error
```
Cause: Backend error
Solution: Check backend logs
```

### CORS Error
```
Cause: Backend not allowing frontend requests
Solution: Check backend CORS configuration
```

---

## 💡 Pro Tips

### Quick Testing Tips
```bash
# Use unique email each time (prevents duplicate email errors)
email=$(date +%s%N)@test.local

# Keep password consistent for easier testing
password="TestPass123!"

# Use predictable data for easier debugging
firstname="Test"
lastname="Athlete"
phone="+1234567890"
```

### Debug Mode
```bash
# Set localStorage to see auth data
# Open Console and run:
console.log(JSON.parse(localStorage.getItem('auth-storage')))

# Check current user:
console.log(localStorage.getItem('auth-storage')?.user)
```

### Repeat Testing Same User
```bash
# After first test, you can reuse same email
# BUT athlete already exists, so you'll start at Step 2 or 3
# For fresh test, use new email
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ New account creates successfully
2. ✅ Auto-redirects to onboarding (no manual re-login)
3. ✅ Video background is visible (same as login page)
4. ✅ Step 1 form displays with all fields
5. ✅ Step 1 form submits and moves to Step 2
6. ✅ Step 2 form displays with all sections
7. ✅ Step 2 form submits and shows Step 3
8. ✅ Step 3 review page displays correctly
9. ✅ Submit for approval changes status
10. ✅ Redirects to awaiting-approval page

---

## 📞 Getting Help

### Common Questions

**Q: Video not loading - what should I do?**
A: Check if `/media/login-bg.mp4` exists in backend/media folder. If not, add it.

**Q: Form says email already exists - how do I test?**
A: Use a unique email each time (add timestamp: test+$(date +%s)@local.com)

**Q: How do I test rejection feedback?**
A: Need admin access to reject an application first.

**Q: Can I skip Step 2?**
A: No, but you can enter minimal data and click "Complete Registration"

**Q: How do I edit after Step 3?**
A: Click "Edit Registration" button on Step 3 page.

---

## 📋 Final Verification

Run through this checklist one final time:

- [ ] Backend is running without errors
- [ ] Frontend builds without errors
- [ ] Login page displays with video background
- [ ] Can create new account
- [ ] Auto-redirects to onboarding
- [ ] Onboarding has same video background styling
- [ ] Step 1 form submits successfully
- [ ] Step 2 form submits successfully
- [ ] Step 3 shows review page
- [ ] Can submit for approval
- [ ] Redirects to awaiting-approval
- [ ] Mobile view is responsive
- [ ] No console errors
- [ ] Network calls are correct

**If all checked:** ✅ **Ready for production deployment!**

---

**Good luck testing! 🚀**

For detailed testing scenarios, see: `ONBOARDING_TESTING.md`

For architecture details, see: `ONBOARDING_ARCHITECTURE.md`

For UI reference, see: `UI_REFERENCE.md`

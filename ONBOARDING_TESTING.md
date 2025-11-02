# Athlete Onboarding Testing Guide

## Quick Start

### Local Setup
1. Start the backend:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

2. Start the frontend:
```bash
cd frontend
npm run dev
```

3. Open browser: http://localhost:5173

## Test Scenarios

### Scenario 1: Complete Registration & Onboarding (Happy Path)

**Steps:**
1. Click "Create Account" on the login page
2. Enter:
   - Full Name: "John Doe"
   - Email: "john.doe@test.com"
   - Password: "Password123!"
3. Click "Create account" button
4. ✅ Expected: 
   - Account created successfully
   - Automatic redirect to `/athlete-onboarding`
   - Video background displayed (same as login)
   - Step 1 form visible with title "Step 1 of 2: Basic athlete information"

### Scenario 2: Complete Step 1 Form

**Precondition:** You're on the onboarding page, Step 1

**Steps:**
1. Fill in all required fields:
   - First Name: "John"
   - Last Name: "Doe"
   - Birth Date: "2000-01-15"
   - Gender: "Male"
   - Email: "john.doe@test.com"
   - Phone: "+1234567890"
2. Fill in optional fields (height, weight, position, etc.)
3. Click "Next Step" button
4. ✅ Expected:
   - Form submitted successfully
   - Redirect to Step 2 form
   - Title shows "Step 2 of 2: Additional details"
   - All data is saved (refresh won't lose it)

### Scenario 3: Complete Step 2 Form

**Precondition:** You're on Step 2 form

**Steps:**
1. Fill in address information (optional):
   - Address Line 1: "123 Main St"
   - City: "Toronto"
   - Province: "ON"
   - Postal Code: "M5V 3A8"
2. Fill in guardian information (required if athlete is under 18):
   - Guardian Name: "Jane Doe"
   - Guardian Relationship: "Mother"
   - Guardian Email: "jane.doe@test.com"
   - Guardian Phone: "+1234567891"
3. Fill in emergency contact (required):
   - Emergency Contact Name: "Jane Doe"
   - Emergency Contact Relationship: "Mother"
   - Emergency Contact Phone: "+1234567891"
4. Add medical info (optional):
   - Medical Allergies: "Peanuts"
   - Medical Conditions: "None"
5. Click "Complete Registration" button
6. ✅ Expected:
   - Data submitted successfully
   - Redirect to Step 3 (Review & Submit)
   - Success message: "Registration completed successfully!"

### Scenario 4: Submit for Admin Approval

**Precondition:** You're on Step 3 (Review & Submit)

**Steps:**
1. Review the confirmation message
2. Click "Submit for Approval" button
3. ✅ Expected:
   - Button shows loading state
   - Application submitted successfully
   - Redirect to `/awaiting-approval` page
   - Page shows: "Your application is pending review"

### Scenario 5: Edit Onboarding Information

**Precondition:** You're on Step 3

**Steps:**
1. Click "Edit Registration" button
2. ✅ Expected:
   - Redirect back to Step 2 form
   - All previously entered data is preserved
   - Can modify any fields
3. Make a change (e.g., update phone number)
4. Click "Update Registration" button
5. ✅ Expected:
   - Changes saved
   - Success message displayed
   - Return to Step 3

### Scenario 6: Rejection & Re-entry

**Precondition:** Admin has rejected your application with feedback

**Steps:**
1. You're redirected to `/athlete-onboarding` with status "REJECTED"
2. ✅ Expected:
   - Page shows: "Please review and update your information based on the feedback provided."
   - Red box displays admin feedback: "Issues found: [admin message]"
   - Form is back at Step 1
3. Fix the issues according to feedback
4. Submit again for approval
5. ✅ Expected: Status changes back to "PENDING"

### Scenario 7: Session Persistence

**Precondition:** You've filled in Step 1 form

**Steps:**
1. Don't submit yet, just fill in the form
2. Refresh the browser page (F5)
3. ✅ Expected:
   - You stay on the onboarding page
   - Step 1 form is displayed again
   - **Note:** Data is NOT persisted across page refreshes (forms reset) - this is expected behavior

**Alternative - Between Steps:**
1. Complete Step 1 → on Step 2
2. Refresh page
3. ✅ Expected:
   - Still on Step 2
   - Data from athlete record is reloaded
   - Previous step data is preserved in the backend

### Scenario 8: Video Background Loading

**Precondition:** You're on any onboarding step

**Steps:**
1. Observe the page load
2. ✅ Expected:
   - Video plays in background (same as login page)
   - Video loops smoothly
   - Dark overlay (50% black) is visible over video
   - Form is readable on top of overlay
   - Video doesn't cause performance issues

## Edge Cases & Error Handling

### Invalid Form Data
1. **Missing Required Fields**: Try submitting Step 1 without filling email
   - ✅ Expected: Form shows validation error

2. **Invalid Email**: Enter "not-an-email" in email field
   - ✅ Expected: Form shows email format error

3. **Invalid Phone**: Enter "abc" in phone field
   - ✅ Expected: Form shows validation error

4. **Invalid Birth Date**: Enter future date
   - ✅ Expected: Form shows age validation error

### Network Errors
1. Stop the backend server mid-submission
   - ✅ Expected: Error message shows "Unable to complete registration"

2. Slow network simulation (DevTools)
   - ✅ Expected: Loading spinner shows, buttons are disabled

### Concurrent Actions
1. Rapidly click "Next Step" button multiple times
   - ✅ Expected: Only one submission occurs, button disabled during submission

## Browser DevTools Checks

### Network Tab
- Check that all API calls complete successfully
- POST `/api/v1/athletes` should return 201 with athlete data
- POST `/api/v1/athletes/{id}/complete-registration` should return 200
- POST `/api/v1/athletes/{id}/submit-approval` should return 200

### Console Tab
- No JavaScript errors should appear
- Auth token should be stored in localStorage under `auth-storage`
- User info should be logged on mount

### Storage Tab
- localStorage should contain `auth-storage` with user and token
- Token should be JWT format
- User object should have `athlete_id` after Step 1

## Performance Checks

### Page Load Time
- Step 1 page should load < 1 second
- Form interactions should be instant (no lag typing)

### Video Performance
- Video should play smoothly without stuttering
- CPU usage should be minimal when video is paused/hidden

### Form Submission
- Step 1 submission should complete within 2 seconds
- Step 2 submission should complete within 3 seconds

## Mobile Testing

### Responsive Breakpoints
Test on:
- **Mobile** (375px): iPhone SE
- **Tablet** (768px): iPad
- **Desktop** (1024px+)

### Expected Behavior
- Form fields should stack vertically on mobile
- Buttons should remain accessible and full-width
- Video background should load but may have reduced quality
- Scrolling should be smooth within form container

## Common Issues & Troubleshooting

### "Loading..." spinner stuck
**Cause:** Backend not running or network error
**Fix:** Check backend is running on http://localhost:8000

### Video background not showing
**Cause:** Media file missing or not loading
**Fix:** Check `/media/login-bg.mp4` exists in backend media folder

### Form submission fails with 422 error
**Cause:** Invalid payload format
**Fix:** Check browser console for exact error, verify all required fields are filled

### Redirect to login after onboarding
**Cause:** Token expired or localStorage cleared
**Fix:** Normal behavior - just login again with same credentials

### Step 2 form shows "Loading athlete information..."
**Cause:** Athlete record not created from Step 1
**Fix:** Check backend logs for athlete creation errors

## Success Indicators

✅ You know onboarding is working when:
1. New account can be created successfully
2. Both Step 1 and Step 2 forms submit without errors
3. Submit for Approval button changes status to PENDING
4. User can navigate to `/awaiting-approval` after submission
5. Admin can see athlete in admin panel and approve/reject
6. Athlete can re-enter onboarding if rejected
7. Approved athletes can access `/reports` page
8. All forms display correctly on mobile and desktop

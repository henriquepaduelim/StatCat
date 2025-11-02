# Visual UI Reference - Athlete Onboarding Flow

## Screen Layouts

### 1. Login Page - Initial State
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│                ┌─────────────────────────┐            │
│                │                          │            │
│                │    Combine Football      │            │
│                │                          │            │
│                │  ┌─ Sign In ─┬─ Create ─┐│            │
│                │  │           │ Account  ││            │
│                │  └───────────┴──────────┘│            │
│                │                          │            │
│                │  Email                   │            │
│                │  [________________]      │            │
│                │                          │            │
│                │  Password                │            │
│                │  [________________]      │            │
│                │                          │            │
│                │  [ Sign In Button ]      │            │
│                │                          │            │
│                │  or with Google          │            │
│                │  [ Continue with Google ]│            │
│                │                          │            │
│                └─────────────────────────┘            │
│                                                       │
│        By signing in, you agree to our               │
│        terms of service and privacy policy           │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2. Login Page - Create Account Mode
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│                ┌─────────────────────────┐            │
│                │                          │            │
│                │   Create your account    │            │
│                │                          │            │
│                │   Create your athlete    │            │
│                │   account to access      │            │
│                │   your reports and       │            │
│                │   performance data.      │            │
│                │                          │            │
│                │  ┌─ Sign In ─┬─ Create ─┐│            │
│                │  │           │ Account  ││            │
│                │  └───────────┴──────────┘│            │
│                │                          │            │
│                │  Full name               │            │
│                │  [Marvin Fergusson____]  │            │
│                │                          │            │
│                │  Email                   │            │
│                │  [________________]      │            │
│                │                          │            │
│                │  Password                │            │
│                │  [________________]      │            │
│                │                          │            │
│                │  [ Create account ]      │            │
│                │                          │            │
│                └─────────────────────────┘            │
│                                                       │
│        By signing in, you agree to our               │
│        terms of service and privacy policy           │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 3. Onboarding Page - Step 1 (Basic Information)
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│              ┌──────────────────────────┐             │
│              │                          │             │
│              │ Complete Your Athlete    │             │
│              │ Profile                  │             │
│              │                          │             │
│              │ Step 1 of 2: Basic       │             │
│              │ athlete information      │             │
│              │                          │             │
│              │ ┌─ Identity ──────────┐  │             │
│              │ │                      │  │             │
│              │ │ First Name Last Name │  │             │
│              │ │ [_______]  [_______] │  │             │
│              │ │                      │  │             │
│              │ │ Birth Date  Gender   │  │             │
│              │ │ [________]  [Male ▼] │  │             │
│              │ │                      │  │             │
│              │ │ Email               │  │             │
│              │ │ [__________________]│  │             │
│              │ │                      │  │             │
│              │ │ Phone Height Weight  │  │             │
│              │ │ [_____] [__] [__]    │  │             │
│              │ │                      │  │             │
│              │ │ Dominant Foot        │  │             │
│              │ │ [Right ▼]            │  │             │
│              │ └─────────────────────┘  │             │
│              │                          │             │
│              │ ┌─ Registration ───────┐  │             │
│              │ │                      │  │             │
│              │ │ Year Category Status │  │             │
│              │ │ [____] [Youth ▼]     │  │             │
│              │ │ [New ▼]              │  │             │
│              │ │                      │  │             │
│              │ │ Position Jersey Num  │  │             │
│              │ │ [_________] [__]     │  │             │
│              │ │                      │  │             │
│              │ │ Team [Select ▼]      │  │             │
│              │ └─────────────────────┘  │             │
│              │                          │             │
│              │        [ Cancel ] [ Next Step ]         │             
│              │                          │             │
│              └──────────────────────────┘             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 4. Onboarding Page - Step 2 (Additional Details)
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│              ┌──────────────────────────┐             │
│              │                          │             │
│              │ Complete Your Athlete    │             │
│              │ Profile                  │             │
│              │                          │             │
│              │ Step 2 of 2: Additional  │             │
│              │ details                  │             │
│              │                          │             │
│              │ ╎ SCROLLABLE FORM AREA   │             │
│              │ ╎                        │             │
│              │ ╎ ┌─ Contact Info ─────┐ ╎             │
│              │ ╎ │ Email Phone         │ ╎             │
│              │ ╎ │ [______] [_______]  │ ╎             │
│              │ ╎ └────────────────────┘ ╎             │
│              │ ╎                        ╎             │
│              │ ╎ ┌─ Address ──────────┐ ╎             │
│              │ ╎ │ Line 1, Line 2      │ ╎             │
│              │ ╎ │ [__________] [____] │ ╎             │
│              │ ╎ │ City Province Postal│ ╎             │
│              │ ╎ │ [____] [__] [______]│ ╎             │
│              │ ╎ └────────────────────┘ ╎             │
│              │ ╎                        ╎             │
│              │ ╎ ┌─ Guardian Info ────┐ ╎             │
│              │ ╎ │ Name Relationship   │ ╎             │
│              │ ╎ │ [______] [_______]  │ ╎             │
│              │ ╎ │ Email Phone         │ ╎             │
│              │ ╎ │ [_______] [_______] │ ╎             │
│              │ ╎ │ ☐ Add 2nd Guardian  │ ╎             │
│              │ ╎ └────────────────────┘ ╎             │
│              │ ╎                        ╎             │
│              │ ╎ ┌─ Emergency Contact ┐ ╎             │
│              │ ╎ │ Name Relationship   │ ╎             │
│              │ ╎ │ [______] [_______]  │ ╎             │
│              │ ╎ │ Phone               │ ╎             │
│              │ ╎ │ [_________________] │ ╎             │
│              │ ╎ └────────────────────┘ ╎             │
│              │ ╎                        ╎             │
│              │ ╎ ┌─ Medical Info ─────┐ ╎             │
│              │ ╎ │ Allergies Conditions│ ╎             │
│              │ ╎ │ [______] [_______]  │ ╎             │
│              │ ╎ │ Physician Physician │ ╎             │
│              │ ╎ │ Name   Phone        │ ╎             │
│              │ ╎ │ [_____] [_______]   │ ╎             │
│              │ ╎ └────────────────────┘ ╎             │
│              │                          │             │
│              │        [ Skip ] [ Complete ]           │             
│              │                          │             │
│              └──────────────────────────┘             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 5. Onboarding Page - Step 3 (Review & Submit)
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│              ┌──────────────────────────┐             │
│              │                          │             │
│              │     Registration         │             │
│              │     Complete!            │             │
│              │                          │             │
│              │  You have successfully   │             │
│              │  completed your athlete  │             │
│              │  registration. You can   │             │
│              │  now submit your         │             │
│              │  application for admin   │             │
│              │  review and approval.    │             │
│              │                          │             │
│              │  ┌────────────────────┐  │             │
│              │  │ What happens next?  │  │             │
│              │  │                     │  │             │
│              │  │ 1. Your application │  │             │
│              │  │    will be reviewed │  │             │
│              │  │    by our admin     │  │             │
│              │  │    team             │  │             │
│              │  │                     │  │             │
│              │  │ 2. You'll receive   │  │             │
│              │  │    an approval or   │  │             │
│              │  │    feedback for     │  │             │
│              │  │    any needed       │  │             │
│              │  │    changes          │  │             │
│              │  │                     │  │             │
│              │  │ 3. Once approved,   │  │             │
│              │  │    you'll have full │  │             │
│              │  │    access to the    │  │             │
│              │  │    platform         │  │             │
│              │  └────────────────────┘  │             │
│              │                          │             │
│              │  [ Edit ] [ Submit for ]  │             │
│              │                [ Approval]             │             
│              │                          │             │
│              └──────────────────────────┘             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 6. Loading State
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│       [Video Background - Football Combine]          │
│       [Semi-transparent dark overlay]                │
│                                                       │
│                   ┌─ ─ ─ ─ ─ ─ ─┐                     │
│                  ╱              ╲                     │
│                 │     ⟳⟳⟳      │                    │
│                  ╲              ╱                     │
│                   └─ ─ ─ ─ ─ ─ ─┘                     │
│                                                       │
│        Loading your athlete profile...               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Color & Styling Reference

### Color Palette
```
Primary Background:    #000000 (black)
Overlay:              rgba(0, 0, 0, 0.5) (50% transparent black)

Container:            #f5f7fa (light gray)
Container Border:     rgba(0, 0, 0, 0.1) (very light gray)

Text Primary:         #1f2937 (dark gray)
Text Secondary:       #6b7280 (medium gray)
Text Muted:           #9ca3af (light gray)

Action Primary:       #3b82f6 (blue)
Action Primary Hover: #2563eb (darker blue)
Action Primary Text:  #ffffff (white)

Error:                #dc2626 (red)
Success:              #059669 (green)
Warning:              #d97706 (amber)

Border:               #e5e7eb (very light gray)
Shadow:               0 10px 15px rgba(0,0,0,0.1)
```

### Typography
```
Heading 1:   size-2xl, font-semibold, text-container-foreground
Heading 2:   size-xl, font-semibold, text-container-foreground
Body:        size-sm, font-medium, text-muted
Labels:      size-sm, font-medium, text-muted
Buttons:     size-sm, font-semibold
```

### Spacing
```
Container Padding:   p-8 (32px)
Section Padding:     p-4 (16px)
Gap between items:   gap-4 (16px)
Section Margin:      mb-6, mt-2
```

### Borders & Shadows
```
Container:    rounded-2xl, shadow-xl
Sections:     rounded-lg, shadow-sm
Inputs:       rounded-md, border border-black/10
Buttons:      rounded-md or rounded-lg
Shadow:       shadow-xl (cards), shadow-sm (sections)
```

---

## Responsive Breakpoints

### Mobile (< 640px)
```
Container:    Full width with px-4 padding
Form Fields:  Stack vertically (1 column)
Buttons:      Full width, stacked
Video:        Still plays but may have performance impact
```

### Tablet (640px - 1024px)
```
Container:    max-w-2xl (512px) centered
Form Fields:  2-3 columns where applicable
Buttons:      Side by side (if space)
Video:        Full quality
```

### Desktop (> 1024px)
```
Container:    max-w-2xl (512px) centered
Form Fields:  Multiple columns (3-5)
Buttons:      Spread out with spacing
Video:        Full quality and performance
```

---

## Interactive States

### Buttons

**Normal State:**
```
bg-action-primary px-4 py-2 rounded-lg
text-action-primary-foreground font-semibold
shadow-sm transition
```

**Hover State:**
```
bg-action-primary/90 (lighter)
cursor-pointer
```

**Disabled State:**
```
opacity-60
cursor-not-allowed
```

**Loading State:**
```
Button text: "Loading..."
Disabled: true
Spinner visible
```

### Input Fields

**Normal State:**
```
border border-black/10 px-3 py-2 rounded-md
focus: outline-none (handled by form component)
```

**Focus State:**
```
border border-action-primary
shadow-sm outline-none
```

**Error State:**
```
border border-red-500 or red-600
text-red-600 error message below
```

---

## Animation Reference

### Spinner (Loading)
```css
animation: spin 1s linear infinite;
border-top: 4px solid white
border-right: 4px solid white/30
border-bottom: 4px solid white/30
border-left: 4px solid white/30
```

### Smooth Transitions
```css
transition: all 200ms ease-in-out
/* Applies to: background-color, border-color, opacity */
```

---

## Accessibility Features

### Color Contrast
- Text on background: AAA (contrast ratio > 7:1)
- Text on buttons: AAA (contrast ratio > 7:1)
- Error text: Red (#dc2626) on white background: AA+

### Focus States
- All interactive elements have visible focus indicators
- Focus order follows visual hierarchy
- Tab key navigates through form fields

### Labels
- Every input has associated `<label>` element
- Labels include required indicator (*)
- Error messages are clearly associated with inputs

---

## Form Validation Visual Indicators

### Required Field
```
Label with asterisk:
"Full Name *"

On empty submit:
Red border on input
Error message: "This field is required"
```

### Invalid Input
```
Email field with "abc":
Red border
Error message: "Please enter a valid email address"
```

### Valid Input
```
Green check mark (optional visual feedback)
No error message
Input background stays normal
```

---

## Print Styles (If Needed)

```css
@media print {
  video { display: none; }
  overlay { display: none; }
  container { 
    border: 1px solid #ccc;
    box-shadow: none;
    max-width: 100%;
    padding: 20px;
  }
}
```

---

## Dark Mode Support (Future Enhancement)

```
Background:   #1f2937 instead of white
Text:         #f3f4f6 instead of #1f2937
Containers:   #374151 instead of #f5f7fa
Borders:      #4b5563 instead of #e5e7eb
```

# Physical Testing Checklist - Before You Demo
**Step-by-Step | Click Everything | Make Sure It Works**

---

## ⚠️ CRITICAL - DO THIS BEFORE YOU WALK IN

You need to **physically test the app** so nothing surprises you during the demo.

This checklist walks you through clicking every part, verifying it works, and noting any issues.

**Time**: 20 minutes

---

## SETUP (5 minutes)

### Step 1: Make Sure Server is Running
```
Open PowerShell and run:
cd k:\Projects\VerifiedBizLink
npm run dev
```

Wait for: `✓ Ready in 2.1s`

✅ **CHECK**: Server shows "Ready in X seconds"
- If error: Your Node or npm is broken
- Fix: Close PowerShell, retry

### Step 2: Open Browser
- Open **Chrome, Firefox, or Edge** (not Internet Explorer)
- Go to: `http://localhost:9002/login`
- Wait for page to load (should be <2 seconds)

✅ **CHECK**: See login page with black background and gold accents
- If blank page: Server didn't start properly
- If "Can't reach server": Wrong URL
- Fix: Check server is running, refresh browser (Ctrl+R)

---

## TEST 1: LOGIN PAGE (2 minutes)

### Check Login Page Elements
```
☐ Email field visible
☐ Password field visible
☐ "Sign In Securely" button visible
☐ "Create one for free" link visible
☐ Left side shows "Where ambitious businesses connect" text
☐ Three feature boxes visible (Verification, Discovery, Profiles)
```

### Test Password Toggle
```
1. Click password field
2. Type: Demo123!
   ☐ Password shows as dots (•••••••)
3. Click eye icon (toggle button)
   ☐ Password now shows as text
4. Click eye icon again
   ☐ Password hides again
5. Clear the field
```

### Test Email Field
```
1. Click email field
2. Type: test@test.com
   ☐ Text appears in field
3. Delete text
   ☐ Field clears properly
```

---

## TEST 2: LOGIN (3 minutes)

### Attempt Login
```
1. Email field: demo@example.com
2. Password field: Demo123!
3. Click "Sign In Securely" button
```

### What Should Happen
✅ Button shows loading spinner briefly  
✅ Page redirects to home page  
✅ Left sidebar appears with navigation  
✅ Center feed shows  
✅ Right sidebar shows featured businesses  

### If Login Fails
❌ Error toast appears  
❌ Error message says "Invalid credentials"

If this happens:
- Check if user exists in database
- Try creating a new account instead (skip to Step 3)

---

## TEST 3: HOME PAGE TOUR (5 minutes)

### Left Sidebar Navigation
```
☐ Sidebar visible on left side
☐ VerifiedBizLink logo at top
☐ "Home" link (with house icon)
☐ "Network" link (with people icon)
☐ "Vetting" or "Verify Your Business" link
☐ "Settings" link (with gear icon)
☐ "Logout" or "Sign Out" link at bottom
```

**Test it works:**
```
1. Click each link
   ☐ "Home" - goes to feed
   ☐ "Network" - shows connections
   ☐ "Vetting" - shows verification page
   ☐ "Settings" - shows settings page
2. Go back to Home
```

### Center Feed
```
1. Scroll down
   ☐ Posts appear
   ☐ Each post shows: author, content, avatar, timestamp
   ☐ Some posts have gold checkmark (verified badge)
   
2. Look for at least one post with:
   ☐ Author name
   ☐ Company name
   ☐ Gold checkmark ✓
   ☐ "Likes" count
   ☐ "Comments" count
```

### Test Feed Interactions
```
1. Find a post
2. Click "Like" button
   ☐ Button color changes
   ☐ Like count increases by 1
   ☐ "Liked" text appears
   
3. Click "Comment" button
   ☐ Comment box opens below post
   ☐ Text input field appears
   
4. Type something in comment field
   ☐ Text appears
   
5. Click send/submit (or press Ctrl+Enter)
   ☐ Comment appears in list
   ☐ Comment count increases
   
6. Click "Share" button
   ☐ Something happens (share dialog or toast)
```

### Right Sidebar - Featured Businesses
```
Scroll to top of page, look at right side

☐ "Featured Businesses" heading visible
☐ Business cards showing:
   - Company name
   - Logo/avatar
   - Trust score (0-100)
   - Industry tag
   - Verified badge (gold checkmark)
   - "Connect" button
```

**Test it works:**
```
1. Click on a business card
   ☐ Business profile page opens
   ☐ Shows full details (trust score, industry, description)
   ☐ "Connect" button visible
   
2. Click "Connect" button
   ☐ Toast notification appears: "Connection request sent"
   ☐ Button may change state
   
3. Go back to home (browser back or Home link)
```

---

## TEST 4: SEARCH & FILTER (2 minutes)

### Search Box
```
1. Find search box (top of feed)
2. Click in it
3. Type: "Manufacturing"
   ☐ Results filter/search
   ☐ Posts or businesses with that keyword appear
   
4. Clear search
   ☐ All results return
```

### Category Filter
```
1. Look for category buttons (near search)
2. Click one (like "Manufacturing" or "Services")
   ☐ Posts filter to that category
   ☐ Results update
   
3. Click "All" to see everything again
   ☐ All results return
```

---

## TEST 5: BUSINESS PROFILE (2 minutes)

### View Business Profile
```
1. Click a featured business or business name
2. Profile page opens showing:
   ☐ Company logo/avatar
   ☐ Company name
   ☐ Trust score (95 = verified)
   ☐ Industry tag
   ☐ Verified badge (green or gold)
   ☐ Description
   ☐ Website, phone, address
   ☐ "Connect" button
   ☐ Reviews section (might be empty)
```

### Test Connect Button
```
1. Click "Connect" button
   ☐ Toast appears: "Connection request sent"
   ☐ Button state changes (might be disabled or show "Requested")
```

---

## TEST 6: VETTING HUB (3 minutes)

### Navigate to Vetting Hub
```
1. Click "Verify Your Business" in sidebar (or Vetting link)
2. Vetting page loads showing:
   ☐ Business info form with fields:
      - Company name
      - Industry
      - Registration number
      - VAT number
      - Description
      - Website
      - Phone
      - Address
   
   ☐ Document upload section with 5 areas:
      1. CIPC Certificate
      2. VAT Letter
      3. ID Proof
      4. Bank Proof
      5. Business Proof
   
   ☐ Status indicator showing current status
   ☐ Submit button (if applicable)
```

### Test Form Fields
```
1. Find a text field (like "Company Name")
2. Click it
   ☐ Field gets focus (border highlight)
3. Type something
   ☐ Text appears
4. Edit the text
   ☐ Can delete and retype
```

### Test Document Upload Area
```
1. Click one of the document upload boxes
   ☐ File picker dialog opens (Choose File dialog)
   ☐ You can browse your computer
2. Close the dialog (don't actually upload)
   ☐ Dialog closes
   
3. Look for preview/download buttons if documents already uploaded
   ☐ Buttons should be clickable
```

---

## TEST 7: NETWORK/CONNECTIONS (2 minutes)

### Navigate to Network
```
1. Click "Network" in sidebar
2. Page loads showing:
   ☐ "Pending Requests" section
   ☐ "Your Connections" section
   ☐ Search box to filter connections
```

### Test Pending Requests
```
1. Look at pending requests (if any)
   ☐ Shows user avatar
   ☐ Shows user name
   ☐ Shows company (if applicable)
   ☐ "Accept" button
   ☐ "Reject" button
   
2. Test Accept button
   ☐ Click "Accept"
   ☐ Toast shows: "Connection accepted"
   ☐ Request moves to Your Connections
   
OR
   ☐ Click "Reject"
   ☐ Request disappears
```

### Test Your Connections
```
1. Look at accepted connections list
   ☐ Shows user details
   ☐ Shows verified badge (if verified)
   ☐ Search box filters list
   
2. Test search
   ☐ Type a name
   ☐ List filters
```

---

## TEST 8: SETTINGS (2 minutes)

### Navigate to Settings
```
1. Click "Settings" in sidebar
2. Settings page loads showing tabs:
   ☐ Profile tab
   ☐ Password tab (or Security)
   ☐ Notifications tab
   ☐ Privacy tab (if applicable)
```

### Test Profile Tab
```
1. Click "Profile" tab
2. See editable fields:
   ☐ Full Name field
   ☐ Headline field
   ☐ Location field
   ☐ Bio field
   ☐ Phone field
   ☐ Avatar upload button
   
3. Click in one field, type something
   ☐ Text appears
4. Look for "Save" button
   ☐ "Save" button visible
```

### Test Password Change
```
1. Click "Password" or "Security" tab
2. See fields:
   ☐ Current password field
   ☐ New password field
   ☐ Confirm password field
3. Fields should accept input (don't actually change password)
```

### Test Logout
```
1. Scroll down or look for "Logout" button
2. Click "Logout" button
   ☐ Redirects to login page
   ☐ You're logged out
```

---

## TEST 9: MOBILE RESPONSIVE (3 minutes)

### Open DevTools
```
1. Press F12 (opens DevTools)
2. DevTools appears at bottom of screen
3. Look for device toggle icon (usually top left of DevTools)
   or Press: Ctrl+Shift+M
4. Select "iPhone 12 Pro" from dropdown
```

### Test Mobile Layout
```
At 390px width (mobile), you should see:

☐ Top header with logo (not full sidebar)
☐ BOTTOM navigation bar with:
   - Home icon
   - Network icon
   - Vetting icon
   - Settings icon
   
☐ Left sidebar GONE
☐ Content centered and readable
☐ No horizontal scrolling
☐ Buttons are big enough to tap
☐ Text is readable without zoom
```

### Test Mobile Interactions
```
1. Click bottom "Home" button
   ☐ Goes to feed
2. Click bottom "Network" button
   ☐ Shows connections
3. Click "Vetting" button
   ☐ Shows verification page
4. Click "Settings" button
   ☐ Shows settings
5. Try scrolling
   ☐ Smooth, no jank
6. Try clicking buttons
   ☐ All clickable
```

### Test Tablet View
```
1. In DevTools, select "iPad" (768px)
2. Layout should:
   ☐ Show left sidebar (smaller)
   ☐ Show main content (wider)
   ☐ Be readable and organized
   ☐ No broken layout
```

### Return to Desktop
```
1. Close DevTools (Press F12 again)
2. Back to full desktop view
```

---

## TEST 10: BUTTON & FORM QUALITY (2 minutes)

### Check Button States
```
For any button on the page:

1. Click and hold it
   ☐ Button shows "pressed" state (darker color)
2. Release mouse
   ☐ Button returns to normal
3. Hover over button
   ☐ Button shows hover state (slight color change/shadow)
4. Press Tab key multiple times until button is focused
   ☐ Button has visible focus ring (border highlight)
   ☐ This shows keyboard users can navigate
```

### Check Form Validation
```
1. Find an email field
2. Type: "invalidinput"
   ☐ No @ sign
3. Try to submit form
   ☐ Error message appears
   ☐ Form doesn't submit
   ☐ Message says something like "Please enter a valid email"

4. Clear field, type valid email
   ☐ Error goes away
   ☐ Form allows submission
```

### Check Loading States
```
1. Any time something takes a moment to load
   ☐ Spinner appears (usually circular animated spinner)
   ☐ Shows progress/loading
2. When done loading
   ☐ Spinner disappears
   ☐ Content appears
```

### Check Toast Notifications
```
1. Do any action that shows a notification (like Like or Connect)
   ☐ Toast message appears
   ☐ Usually slides in from top right
   ☐ Shows success message (green) or error (red)
   ☐ Disappears after 3-5 seconds
```

---

## TEST 11: CONSOLE CHECK (1 minute)

### Check for Errors
```
1. Press F12 (opens DevTools)
2. Click "Console" tab
3. Look for any RED ERROR messages
   ☐ Should be EMPTY or just warnings
   
If you see red errors:
   ☐ Note what they say
   ☐ Take a screenshot
   ☐ These are issues

4. Close DevTools (F12 again)
```

---

## TEST 12: PERFORMANCE CHECK (1 minute)

### Check Page Load Speed
```
1. Press F12
2. Click "Network" tab
3. Close DevTools
4. Go to home page
5. Open DevTools again
6. Look at Network tab
   ☐ Find the main page request (first one, usually)
   ☐ Look at "Time" column
   ☐ Should be under 2000ms (2 seconds)
   
If over 3 seconds:
   ☐ Note which page is slow
   ☐ Could be a problem
```

---

## FINAL CHECKLIST

After completing all tests above, check off:

```
PAGES TESTED:
☐ Login page loads and functions
☐ Home page loads with feed
☐ Business profile works
☐ Network/Connections works
☐ Vetting Hub loads
☐ Settings page loads
☐ Mobile view responsive
☐ Tablet view responsive
☐ Desktop view full-featured

INTERACTIONS TESTED:
☐ Form fields accept input
☐ Buttons are clickable
☐ Links navigate correctly
☐ Search works
☐ Filters work
☐ Comments work
☐ Likes work
☐ Connection requests work
☐ All error states show messages

QUALITY CHECKS:
☐ No red errors in console
☐ Page loads < 2 seconds
☐ Mobile layout correct
☐ Buttons have hover states
☐ Buttons have active states
☐ Loading spinners appear
☐ Toast notifications work

MOBILE SPECIFIC:
☐ Bottom nav visible on mobile
☐ Layout responsive at 375px
☐ Layout responsive at 768px (tablet)
☐ Touch buttons large enough (44px+)
☐ No horizontal scroll
☐ Text readable

READY FOR DEMO?
☐ YES - Everything works
☐ NO - Found issues (list below)
```

---

## IF YOU FIND ISSUES

### Document It
```
Issue #1:
- What: (What broke?)
- Where: (Which page/button?)
- When: (First click? Second?)
- What was expected: (What should happen?)
- What happened instead: (What did happen?)
- Screenshot: (Can you take one?)
```

### Quick Fixes
```
Issue: "Page not loading"
Fix: Refresh browser (Ctrl+R), restart server

Issue: "Button doesn't work"
Fix: Refresh page, try again

Issue: "Form won't submit"
Fix: Check all required fields are filled, check console for errors

Issue: "Mobile layout broken"
Fix: Make browser narrower/wider, refresh DevTools device emulation
```

### Last Resort
If something is seriously broken and you can't fix it:
1. **Don't demo that feature**
2. **Talk around it** - "Let me show you this other part first"
3. **Skip to the next feature**
4. **Don't apologize** - Act like it's intentional

---

## YOU'RE READY

Once you've checked off all boxes in "FINAL CHECKLIST" and everything shows ✅:

**You're completely ready to demo.**

You've physically tested everything. You know what works. You know where the buttons are. You won't be surprised.

Now go in and **crush it**. 🚀

---

**Testing Checklist Time: 20 minutes**  
**Confidence Level After: 100%**  
**Ready to Demo: YES**

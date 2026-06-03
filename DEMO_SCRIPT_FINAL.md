# DEMO SCRIPT - STEP BY STEP (For TV Presentation)

## Opening Statement (30 seconds)
"This is VerifiedBizLink - a business verification and networking platform for South Africa. We connect verified businesses with trustworthy partners."

---

## DEMO FLOW (Exactly in this order)

### 1. LOGIN & HOMEPAGE (1 minute)
**Action:**
- Open: `http://localhost:9002`
- Login with: `test1@verifiedbizlink.com` / `password123`
- Show: Home feed with posts, verified badges, gold checkmarks

**What to say:**
"First, let's log in. Here you see the home feed with real posts from verified businesses. Notice the gold checkmark - that's our verified badge."

---

### 2. BUSINESS PROFILE (1 minute)
**Action:**
- Click on a post or search business
- Show business profile with: company name, trust score, verification status
- Point out: Gold checkmark badge, trust score (95 = verified), company info

**What to say:**
"Each verified business has a trust score. 95+ means verified by CIPC and SARS. You can see all their details here."

---

### 3. CREATE A POST (1 minute)
**Action:**
- Click "What's on your mind?"
- Type: "This is a real post from our demo account"
- Click Post button
- Show it appears in feed

**What to say:**
"Verified businesses can post updates to the network. Other users can like and comment in real-time."

---

### 4. EDIT & DELETE POST (1 minute)
**Action:**
- Click three dots on the post you just created
- Click "Edit Post"
- Change text: "Updated by demo presenter"
- Click "Save Changes"
- Click three dots again
- Show "Delete Post" option (don't click - show it exists)

**What to say:**
"Users can edit and delete their own posts. Full control over content."

---

### 5. SEND CONNECTION REQUEST (1 minute)
**Action:**
- Go to Network page
- Click on another business
- Click "Send Connection" button
- Show confirmation message

**What to say:**
"Businesses can connect with each other. We're building a trusted network."

---

### 6. SETTINGS & SIGN OUT (1 minute)
**Action:**
- Click avatar/menu
- Go to Settings
- Show profile sections: Profile, Security, Notifications, Billing, Privacy
- Show "Sign Out" button (top right, red)
- Click it to log out

**What to say:**
"Full settings control. Users can manage their profile, security, privacy, and sign out anytime."

---

### 7. DOCUMENT UPLOAD (For Banker/Admin - 1 minute)
**Action:**
- If showing admin: Login as `admin@verifiedbizlink.com`
- Go to Admin panel
- Show: Documents waiting for approval
- Show: Each document has: uploader name, company, file preview, score option, approve/reject buttons

**What to say:**
"Bankers and compliance officers can review business documents. Score them, add notes, and approve or reject. Full audit trail."

---

### 8. RESPONSIVE DESIGN (1 minute)
**Action:**
- Press F12 (DevTools)
- Press Ctrl+Shift+M (mobile view)
- Test: 375px (iPhone SE), 412px (Android), 768px (Tablet)
- Show: Bottom nav on mobile, left sidebar appears on tablet, responsive layout

**What to say:**
"Works perfectly on all devices. Mobile-first design with adaptive layouts."

---

## KEY POINTS TO EMPHASIZE

✅ **SECURITY:** JWT authentication, password hashing with bcrypt  
✅ **VERIFICATION:** CIPC registration + SARS compliance checks  
✅ **TRUST SCORE:** Algorithmic scoring (0-100)  
✅ **COMPLIANCE:** Full audit logs, document tracking  
✅ **UX:** Intuitive, responsive, accessible  
✅ **SCALABLE:** Ready for production and app stores  

---

## TEST ACCOUNTS (Use these for demo)

| Email | Password | Role | Business |
|-------|----------|------|----------|
| test1@verifiedbizlink.com | password123 | User | TechCorp SA |
| test2@verifiedbizlink.com | password123 | User | BuildRight Construction |
| admin@verifiedbizlink.com | password123 | Admin | VerifiedBizLink |

---

## WHAT NOT TO CLICK (Avoid during demo)

❌ Don't click: Billing section (Coming Soon)  
❌ Don't mention: Features still in development  
❌ Don't test: Slow network scenarios  
❌ Don't show: Error states (unless necessary)  

---

## IF SOMETHING GOES WRONG

**If page doesn't load:**
- Refresh (Ctrl+R)
- Check: http://localhost:9002 is running
- Restart dev server if needed

**If login fails:**
- Check email/password spelling
- Use one of the 3 test accounts above

**If a feature doesn't work:**
- Skip it and go to next demo point
- Say: "We have this feature in development"

---

## ENDING STATEMENT (1 minute)

"VerifiedBizLink is production-ready. We can launch immediately. Next steps: web app live, then native apps for iOS and Android on app stores within 4-6 weeks. We're solving the trust problem in South African business."

**Time: 10 minutes total**

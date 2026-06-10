# ✅ MANUAL TESTING CHECKLIST - PRINTABLE

**Date Started:** _______________  
**Tester Name:** _______________  
**Device:** _______________  
**Browser:** _______________  
**URL:** https://www.verifiedbizlink.co.za  

---

## 🎯 **PHASE 1: AUTHENTICATION (15 min)**

### Sign Up Flow
- [ ] Sign up page loads
- [ ] Form fields accept input
- [ ] Password requirements display
- [ ] Email validation works
- [ ] Terms checkbox required
- [ ] Submit button enabled when form valid
- [ ] Error messages clear
- [ ] Success redirects to home
- [ ] User profile created
- [ ] Avatar appears

### Login Flow
- [ ] Login page loads
- [ ] Email field works
- [ ] Password field works
- [ ] Remember me checkbox works
- [ ] Submit button works
- [ ] Correct credentials login
- [ ] Incorrect credentials show error
- [ ] Forgot password link works
- [ ] Session persists on refresh
- [ ] Logout works

---

## 🏠 **PHASE 2: HOME FEED (20 min)**

### Feed Display
- [ ] Feed loads with posts
- [ ] Posts show images
- [ ] Business names display
- [ ] Timestamps show
- [ ] Like counts display
- [ ] Comment counts display
- [ ] Content readable
- [ ] No layout breaks
- [ ] Mobile optimized
- [ ] Tablet optimized
- [ ] Desktop optimized

### Like Functionality
- [ ] Like button clickable
- [ ] Heart fills on like
- [ ] Count increases
- [ ] Unlike works
- [ ] Count decreases
- [ ] Persists on refresh
- [ ] Multiple posts can be liked
- [ ] No errors in console

### Comment Functionality
- [ ] Comment button works
- [ ] Form appears
- [ ] Text input works
- [ ] Submit button works
- [ ] Comment appears immediately
- [ ] Author name shows
- [ ] Timestamp shows
- [ ] Multiple comments work
- [ ] Can delete own comments
- [ ] Delete button removes comment
- [ ] Comment count updates

---

## 🖼️ **PHASE 3: IMAGE UPLOADS & COMMENTS (25 min)**

### Upload to Post
- [ ] Go to `/dashboard/test`
- [ ] Text area accepts input
- [ ] Upload button visible
- [ ] Can select image
- [ ] Preview appears
- [ ] Preview is correct
- [ ] Can remove preview
- [ ] Post button works
- [ ] Image saves to Supabase
- [ ] URL generates correctly
- [ ] Image displays in feed
- [ ] Mobile upload works

### Comment with Image
- [ ] Comment form loads
- [ ] Upload button visible in comment
- [ ] Can select image
- [ ] Preview appears below
- [ ] Preview is accurate
- [ ] Can remove preview
- [ ] Comment button works
- [ ] Comment saves with image
- [ ] Image displays in comment
- [ ] Multiple image comments work
- [ ] Images persist on refresh

### Image Quality
- [ ] No pixelation
- [ ] Colors accurate
- [ ] Size optimized
- [ ] Loads quickly
- [ ] Mobile renders well
- [ ] Tablet renders well
- [ ] Desktop renders well

---

## 📱 **PHASE 4: DASHBOARD (20 min)**

### Customer Dashboard (`/dashboard`)
- [ ] Dashboard loads
- [ ] Welcome message shows
- [ ] Stats cards display
- [ ] Numbers are correct
- [ ] Quick action buttons work
- [ ] Hover effects work
- [ ] Mobile responsive
- [ ] No broken layouts

### Favorites Tab
- [ ] Tab clickable
- [ ] Favorites load
- [ ] Grid displays correctly
- [ ] Can remove favorite
- [ ] Updates immediately
- [ ] Mobile optimized

### Following Tab
- [ ] Tab clickable
- [ ] Following list loads
- [ ] Can unfollow
- [ ] Updates immediately
- [ ] Counts accurate

### Saved Posts Tab
- [ ] Tab clickable
- [ ] Saved posts load
- [ ] Can unsave
- [ ] Updates immediately

### Alerts Tab
- [ ] Tab clickable
- [ ] Notifications load
- [ ] Can mark as read
- [ ] Badges show
- [ ] Real-time updates work

---

## 👑 **PHASE 5: ADMIN DASHBOARD (20 min)**

### Access & Roles
- [ ] Ramoen can access `/admin/dashboard`
- [ ] Wesley can access `/admin/dashboard`
- [ ] You can access `/admin/dashboard`
- [ ] Shows "Super Admin Dashboard"
- [ ] Correct role displays

### Ramoen's Tools (Admin)
- [ ] Business Verification visible
- [ ] Vetting Queue visible
- [ ] User Management visible
- [ ] Platform Analytics visible
- [ ] Network Status visible
- [ ] Settings visible
- [ ] All 6 tools clickable
- [ ] Each tool navigates correctly

### Wesley's Tools (Banker)
- [ ] Business Vetting Portal visible
- [ ] Legal Compliance visible
- [ ] Team Management visible
- [ ] All tools clickable
- [ ] Navigate correctly

### Dashboard Stats
- [ ] Pending verifications show
- [ ] Business count shows
- [ ] User count shows
- [ ] System health shows
- [ ] Numbers are current

---

## 🔐 **PHASE 6: VETTING HUB (15 min)**

### Vetting Queue (`/vetting`)
- [ ] Page loads
- [ ] Vetting requests display
- [ ] Status shows (Pending/In Review)
- [ ] Business names show
- [ ] Owner names show
- [ ] Dates show
- [ ] Days waiting shows
- [ ] "Start Review" button works
- [ ] "Approve" button works
- [ ] Actions update UI
- [ ] No console errors

### Vetting Portal
- [ ] Shows pending count
- [ ] Shows in-review count
- [ ] Shows days waiting
- [ ] Tabs work
- [ ] Filters work
- [ ] Search works
- [ ] Can start review
- [ ] Can approve business

---

## 🧠 **PHASE 7: VERIFICATION PORTAL (10 min)**

### Access (`/admin/verify`)
- [ ] Page loads
- [ ] Current user shows
- [ ] Role displays
- [ ] Email correct
- [ ] Status shows

### Admin Users List
- [ ] Ramoen shows
- [ ] Wesley shows
- [ ] You show
- [ ] Tools listed for each
- [ ] Access matrix visible
- [ ] Permissions clear

### Access Matrix
- [ ] Shows all tools
- [ ] Shows all roles
- [ ] Check marks correct
- [ ] X marks correct
- [ ] Easy to understand

---

## 🎨 **PHASE 8: UI/UX REVIEW (20 min)**

### Design
- [ ] Colors consistent
- [ ] Typography clear
- [ ] Spacing uniform
- [ ] Buttons clear
- [ ] Icons consistent
- [ ] Professional appearance
- [ ] Dark theme clean

### User Experience
- [ ] Buttons intuitive
- [ ] Navigation logical
- [ ] Forms clear
- [ ] Errors helpful
- [ ] Success messages show
- [ ] Loading states visible
- [ ] Feedback immediate

### Accessibility
- [ ] Buttons large enough
- [ ] Text readable
- [ ] Contrast sufficient
- [ ] Mobile friendly
- [ ] Keyboard navigation
- [ ] Focus states visible

---

## 📱 **PHASE 9: RESPONSIVE DESIGN (20 min)**

### Mobile (iPhone)
- [ ] Sidebar hamburger menu
- [ ] Content stacks
- [ ] Images scale
- [ ] Buttons clickable
- [ ] No horizontal scroll
- [ ] Text readable
- [ ] Forms work
- [ ] Modals display
- [ ] Gestures work

### Tablet (iPad)
- [ ] Grid adjusts
- [ ] Sidebar toggles
- [ ] Content fits
- [ ] Images scale
- [ ] No cutoff text

### Desktop (1920px)
- [ ] Full layout shows
- [ ] Sidebar always visible
- [ ] Grid 3-4 columns
- [ ] Optimal spacing
- [ ] Professional look

---

## ⚡ **PHASE 10: PERFORMANCE (10 min)**

### Load Times
- [ ] Home page: < 3 seconds
- [ ] Dashboard: < 2 seconds
- [ ] Admin: < 2 seconds
- [ ] Images: < 1 second

### Console Check
- [ ] No red errors
- [ ] No undefined variables
- [ ] No CORS errors
- [ ] No 404 errors
- [ ] Network requests complete
- [ ] No timeout errors

### Network
- [ ] All images load
- [ ] No failed requests
- [ ] API calls work
- [ ] Supabase uploads work

---

## 🔒 **PHASE 11: SECURITY & DATA (10 min)**

### Authentication
- [ ] Can't access admin without login
- [ ] Can't access dashboard without login
- [ ] Sessions work correctly
- [ ] Logout clears session
- [ ] Back after logout redirects

### Data Integrity
- [ ] Comments save correctly
- [ ] Comments persist on refresh
- [ ] Images save to Supabase
- [ ] Database stores correctly
- [ ] User data protected
- [ ] Can't modify others' content

---

## 🎯 **FINAL REVIEW (10 min)**

### Overall Assessment
- [ ] App is fast
- [ ] App is responsive
- [ ] App is beautiful
- [ ] App is intuitive
- [ ] No major bugs
- [ ] No critical errors
- [ ] Professional quality
- [ ] Ready for production

### Issues Found
**Critical:**
- [ ] _______________________________
- [ ] _______________________________

**Major:**
- [ ] _______________________________
- [ ] _______________________________

**Minor:**
- [ ] _______________________________
- [ ] _______________________________

### Improvements Suggested
1. _______________________________
2. _______________________________
3. _______________________________
4. _______________________________
5. _______________________________

---

## ✅ **FINAL SIGN-OFF**

**Testing Date:** _______________

**Tester Name:** _______________

**Total Tests Passed:** _____ / _____

**Pass Rate:** ______ %

**Recommendation:**
- [ ] Ready for Production
- [ ] Needs Minor Fixes
- [ ] Needs Major Fixes
- [ ] Not Ready

**Overall Assessment:**
```
[Write assessment here]
```

**Signature:** _________________________

---

## 📋 **QUICK REFERENCE**

### Critical Features to Test
1. Sign up/login
2. Home feed
3. Comments
4. Image uploads
5. Admin dashboard
6. Vetting tools

### Priority Order
1. Authentication (must work)
2. Feed (most visible)
3. Admin tools (for Ramoen)
4. Uploads (core feature)
5. Responsive (all devices)

### Test URLs
- Home: https://www.verifiedbizlink.co.za
- Dashboard: https://www.verifiedbizlink.co.za/dashboard
- Test Upload: https://www.verifiedbizlink.co.za/dashboard/test
- Admin: https://www.verifiedbizlink.co.za/admin/dashboard
- Verify: https://www.verifiedbizlink.co.za/admin/verify
- Vetting: https://www.verifiedbizlink.co.za/vetting

### Test Accounts
- Email: test@example.com
- Any business email for signup

---

**Estimated Total Testing Time: 3-4 hours**

Print this checklist and mark off as you test!

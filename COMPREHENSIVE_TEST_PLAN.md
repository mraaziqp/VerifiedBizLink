# 🧪 Comprehensive Feature Testing Plan

## **Status: READY FOR TESTING**

All systems should now be working. This guide walks through EVERY feature systematically.

---

## **PHASE 1: AUTHENTICATION & SETUP** ✅

### 1.1 User Registration
- [ ] Open https://www.verifiedbizlink.co.za/signup
- [ ] Register new account with valid email
- [ ] Verify Resend email arrives (check spam)
- [ ] Click email verification link
- [ ] Can now login
- **Expected:** Email arrives within 2 seconds, link works, redirects to login

### 1.2 User Login
- [ ] Go to /login
- [ ] Login with credentials
- [ ] Redirected to /dashboard
- [ ] Session cookie set (check DevTools → Application → Cookies)
- [ ] Can refresh page without logging out
- [ ] Logout button works → redirects to /login
- **Expected:** Smooth flow, no 401 errors

### 1.3 Admin Login
- [ ] Login as Ramoen (ramoen@verifiedbizlink.co.za)
- [ ] Sees Admin Dashboard (different from customer dashboard)
- [ ] Has access to vetting tools
- [ ] Login as Wesley (wesley@verifiedbizlink.co.za)
- [ ] Sees Banking tools
- **Expected:** Different UI per role, tools visible appropriately

---

## **PHASE 2: HOME FEED & POSTING** 📱

### 2.1 Create Post
- [ ] Go to /home
- [ ] Click "Create Post" button
- [ ] Write text content
- [ ] Upload image (test multiple formats: JPG, PNG, WebP)
- [ ] Click "Post"
- [ ] Post appears at top of feed
- **Expected:** Image uploads to Supabase Storage, appears instantly

### 2.2 Home Feed
- [ ] Scroll feed
- [ ] See posts from other users
- [ ] See likes, comments, shares counts
- [ ] Click post → opens detail view
- [ ] Like/unlike button works
- [ ] Comment button opens comment box
- **Expected:** Smooth scrolling, counts update instantly

### 2.3 Comments
- [ ] Click comment icon
- [ ] Write comment
- [ ] Submit
- [ ] Comment appears below post
- [ ] Can delete own comments
- [ ] Comment count updates
- **Expected:** Instant UI updates, proper permissions

---

## **PHASE 3: PROFILE & FOLLOWING** 👤

### 3.1 My Profile
- [ ] Click profile icon (top right)
- [ ] See profile page with avatar, bio, stats
- [ ] Can edit profile information
- [ ] Upload new avatar
- [ ] Save changes
- [ ] Changes persist on refresh
- **Expected:** Form validation works, image uploads correctly

### 3.2 Following System
- [ ] Go to /discover or click another user
- [ ] Click "Follow" button
- [ ] Button changes to "Following"
- [ ] User appears in my "Following" list
- [ ] Can unfollow
- [ ] My follower count updates
- **Expected:** Bidirectional data updates, correct counts

### 3.3 Favorites
- [ ] Click heart icon on a business card
- [ ] Card shows as favorited (visual indicator)
- [ ] Go to /favorites
- [ ] See only favorited items
- [ ] Can remove from favorites
- **Expected:** Favorites persist, show on all devices

---

## **PHASE 4: BUSINESS VERIFICATION & VETTING** 🏢

### 4.1 Verification Status Badge
- [ ] Verified businesses show badge on profile
- [ ] Badge shows: ✅ Verified (CIPC + SARS)
- [ ] Click badge → shows certificate
- [ ] Can download certificate
- **Expected:** Badge visible, certificate downloads as PDF

### 4.2 Trust Score Display
- [ ] Businesses show trust score (0-100)
- [ ] Score based on: verifications, reviews, activity
- [ ] Score updates when new reviews added
- **Expected:** Score visible on business cards, changes in real-time

### 4.3 Badge Levels System
- [ ] Verify levels exist: Bronze, Silver, Gold, Platinum
- [ ] Levels shown on business profile
- [ ] Requirements displayed
- [ ] Level unlocks based on criteria
- **Expected:** Visual progression, clear requirements

### 4.4 Ramoen's Vetting Tools (Admin Only)
- [ ] Login as Ramoen
- [ ] Go to /admin/dashboard or /vetting-hub
- [ ] See vetting queue with pending businesses
- [ ] Click business → vetting form appears
- [ ] Can verify: CIPC number, SARS status, bank details
- [ ] Submit verification → business marked as verified
- [ ] Certificate generated automatically
- **Expected:** All businesses show verified badge after Ramoen approves

### 4.5 Wesley's Banking Tools
- [ ] Login as Wesley
- [ ] Go to admin area
- [ ] See banking/compliance section
- [ ] Can view business banking details
- [ ] Can verify bank account
- [ ] Can flag suspicious activity
- **Expected:** Banking data visible, actions save to DB

---

## **PHASE 5: DASHBOARD & ANALYTICS** 📊

### 5.1 Customer Dashboard
- [ ] Login as customer
- [ ] Dashboard loads with:
  - [ ] Active posts count
  - [ ] Total impressions
  - [ ] Click-through rate
  - [ ] Current plan status
- [ ] Stats cards show staggered animations
- [ ] Hover effects work (cards lift, icons glow)
- **Expected:** Smooth animations, stats accurate

### 5.2 Admin Dashboard (Ramoen)
- [ ] Login as Ramoen
- [ ] See analytics:
  - [ ] Total businesses verified
  - [ ] Pending verifications count
  - [ ] Recent activity log
  - [ ] Performance metrics
- [ ] Can filter by date/status
- [ ] Charts/graphs load properly
- **Expected:** Data accurate, filters work, UI responsive

### 5.3 Tabs System
- [ ] Overview tab: metrics, charts
- [ ] Ads tab: create/manage posts
- [ ] Subscription tab: billing, plan info
- [ ] Settings tab: account, privacy, notifications
- [ ] Switching tabs smooth (fade animations)
- **Expected:** No lag, content loads properly

---

## **PHASE 6: NOTIFICATIONS & ALERTS** 🔔

### 6.1 Notification Bell
- [ ] Click bell icon (top right)
- [ ] See unread notifications
- [ ] Notification count badge
- [ ] Click notification → navigate to item
- [ ] Mark as read
- **Expected:** Badge shows unread count, updates when clicked

### 6.2 Email Notifications
- [ ] Follow someone → get email notification
- [ ] Favorite business → confirmation email
- [ ] New comment on post → get notified
- [ ] Settings → email preferences work
- [ ] Can opt out of emails
- **Expected:** Emails arrive (check spam), preferences save

### 6.3 In-App Notifications
- [ ] Toast notifications appear on actions
- [ ] Success messages (green)
- [ ] Error messages (red)
- [ ] Auto-dismiss after 3 seconds
- [ ] Can dismiss manually
- **Expected:** Clear feedback on all actions

---

## **PHASE 7: MEDIA & UPLOADS** 📸

### 7.1 Image Upload to Supabase
- [ ] Upload image in post
- [ ] Upload avatar
- [ ] Upload business banner
- [ ] Images store in Supabase Storage
- [ ] Images load quickly
- [ ] Images compress properly
- [ ] Multiple images in single post work
- **Expected:** All uploads successful, images visible immediately

### 7.2 Image Optimization
- [ ] Images appear in correct aspect ratio
- [ ] No stretching/distortion
- [ ] Mobile: images responsive
- [ ] Desktop: images properly sized
- [ ] Loading placeholder appears while loading
- **Expected:** Professional appearance on all devices

### 7.3 Video Support (If Implemented)
- [ ] Upload video file
- [ ] Thumbnail appears
- [ ] Play button works
- [ ] Video streams smoothly
- **Expected:** Video playable, doesn't freeze

---

## **PHASE 8: RESPONSIVE DESIGN** 📱💻

### 8.1 Mobile View (375px - iPhone SE)
- [ ] All buttons clickable
- [ ] Text readable
- [ ] Images load
- [ ] Navigation collapses to hamburger
- [ ] Hamburger menu works
- [ ] Form inputs accessible
- [ ] No horizontal scroll
- **Expected:** Perfect mobile experience

### 8.2 Tablet View (768px - iPad)
- [ ] Layout optimized
- [ ] Two-column where appropriate
- [ ] Touch targets adequate
- [ ] Orientation lock respected
- **Expected:** Tablet layout looks native

### 8.3 Desktop View (1920px)
- [ ] Full feature layout
- [ ] Multi-column grids
- [ ] Hover effects visible
- [ ] Sidebar navigation works
- [ ] Tooltips appear on hover
- **Expected:** Professional desktop experience

---

## **PHASE 9: DATABASE & DATA INTEGRITY** 🗄️

### 9.1 User Data
- [ ] User profile saved to Neon
- [ ] Email verified status stored
- [ ] Role persists correctly
- [ ] Followers list in database
- [ ] Following list accurate
- **Expected:** All data consistent, no duplicates

### 9.2 Business Data
- [ ] Business profiles stored in Neon
- [ ] Verification status persists
- [ ] Trust score calculated correctly
- [ ] Badge levels assigned properly
- [ ] Contact info encrypted (if needed)
- **Expected:** CRUD operations work, data valid

### 9.3 Post/Comment Data
- [ ] Posts stored with user_id
- [ ] Comments linked to post_id
- [ ] Likes count accurate
- [ ] Delete operations cascade properly
- [ ] Images soft-deleted
- **Expected:** Data relationships correct, no orphaned records

### 9.4 Database Migrations
- [ ] All 13 tables exist in Neon
- [ ] Column names correct
- [ ] Data types match schema
- [ ] Indexes created
- [ ] RLS policies enabled
- **Expected:** Run: `\dt` in Neon console, verify 13 tables

---

## **PHASE 10: SECURITY & PERMISSIONS** 🔐

### 10.1 Row Level Security (RLS)
- [ ] User can only see own data
- [ ] Direct database queries blocked for others' data
- [ ] Admin can see all data (with proper role)
- [ ] Banker can see banking data only
- [ ] Customer can only see customer fields
- **Expected:** Data isolation works, no cross-user access

### 10.2 Authentication
- [ ] Session expires after 7 days
- [ ] Can't access /admin without admin role
- [ ] Can't access /vetting without permission
- [ ] Logout clears session
- [ ] Token verification works
- **Expected:** Proper auth checks on all routes

### 10.3 Email Verification
- [ ] New users must verify email
- [ ] Can't perform actions before verified (if needed)
- [ ] Resend verification link works
- [ ] Verification link expires after 24 hours
- **Expected:** Email security proper, links work

---

## **PHASE 11: EMAIL INTEGRATION (RESEND)** 📧

### 11.1 Verification Emails
- [ ] Signup → verification email sent
- [ ] Email arrives within 2 seconds
- [ ] Email is professional, branded
- [ ] Link in email works
- [ ] Link expires after 24h
- **Expected:** All emails arrive, styling correct

### 11.2 Notification Emails
- [ ] Welcome email on signup ✅
- [ ] New follower notification
- [ ] New comment notification
- [ ] Post liked notification
- [ ] Admin approval notification (for Ramoen)
- **Expected:** All email types send, content accurate

### 11.3 Email Content
- [ ] Emails have proper branding
- [ ] Links are functional
- [ ] Unsubscribe option visible
- [ ] Plain text fallback works
- [ ] Mobile-friendly rendering
- **Expected:** Professional emails, no broken links

---

## **PHASE 12: API ENDPOINTS** 🔌

### 12.1 Authentication Endpoints
- [ ] POST /api/auth/login → returns token, sets cookie ✅
- [ ] POST /api/auth/logout → clears cookie ✅
- [ ] GET /api/auth/me → returns user data ✅
- [ ] POST /api/auth/signup → creates user
- **Expected:** All endpoints respond correctly

### 12.2 User Endpoints
- [ ] GET /api/users/[id] → returns profile
- [ ] PUT /api/users/[id] → updates profile
- [ ] GET /api/users/[id]/followers → lists followers
- [ ] POST /api/follow → creates follow
- [ ] DELETE /api/follow/[id] → unfollows
- **Expected:** CRUD operations work

### 12.3 Business Endpoints
- [ ] GET /api/businesses → lists all
- [ ] POST /api/businesses → creates business
- [ ] GET /api/businesses/[id] → business details
- [ ] PUT /api/businesses/[id] → updates
- [ ] PUT /api/businesses/[id]/verify → verifies (admin only)
- **Expected:** All operations work with proper permissions

### 12.4 Posts & Comments
- [ ] POST /api/posts → creates post
- [ ] GET /api/posts → lists feed
- [ ] POST /api/posts/[id]/like → likes
- [ ] DELETE /api/posts/[id]/like → unlikes
- [ ] POST /api/posts/[id]/comments → comments
- **Expected:** All endpoints functional

---

## **PHASE 13: PERFORMANCE** ⚡

### 13.1 Load Times
- [ ] Home page loads in < 2s
- [ ] Dashboard loads in < 2s
- [ ] Image loading < 1s
- [ ] API responses < 500ms
- [ ] Smooth scrolling (60fps)
- **Expected:** No noticeable lag, smooth experience

### 13.2 Optimization
- [ ] Images lazy-loaded
- [ ] Code split properly
- [ ] No console errors
- [ ] No memory leaks (refresh often)
- [ ] CSS not duplicated
- **Expected:** Production-ready performance

---

## **TESTING CHECKLIST**

```
Phase 1: Authentication      [ ] [ ] [ ] (3/3)
Phase 2: Feed & Posts        [ ] [ ] [ ] (3/3)
Phase 3: Profiles            [ ] [ ] [ ] (3/3)
Phase 4: Business Vetting    [ ] [ ] [ ] (5/5)
Phase 5: Dashboards          [ ] [ ] [ ] (3/3)
Phase 6: Notifications       [ ] [ ] [ ] (3/3)
Phase 7: Media               [ ] [ ] [ ] (3/3)
Phase 8: Responsive          [ ] [ ] [ ] (3/3)
Phase 9: Database            [ ] [ ] [ ] (4/4)
Phase 10: Security           [ ] [ ] [ ] (3/3)
Phase 11: Email              [ ] [ ] [ ] (3/3)
Phase 12: API Endpoints      [ ] [ ] [ ] (4/4)
Phase 13: Performance        [ ] [ ] [ ] (2/2)

TOTAL TESTS: 48
```

---

## **HOW TO TEST**

1. **Start the app:**
   ```bash
   npm run dev
   ```
2. **Open browser:**
   ```
   http://localhost:3000
   ```
3. **Open DevTools** (F12) → Check Console for errors
4. **Test each phase** systematically
5. **Document any issues** with:
   - [ ] What you did
   - [ ] What you expected
   - [ ] What happened instead
   - [ ] Screenshot/error message

---

## **QUICK TEST (20 minutes)**

If time is limited, test these core paths:

1. **Auth:** Signup → Email verification → Login → Logout
2. **Post:** Create post with image → Like → Comment
3. **Verify:** Login as Ramoen → Verify a business → Check badge
4. **Dashboard:** View analytics, switch tabs
5. **Mobile:** Resize browser to 375px, click buttons

---

## **KNOWN ISSUES TO FIX**

- [ ] Manifest.json headers (FIXED in next.config.ts)
- [ ] Compliance endpoint (CREATED)
- [ ] No users in Supabase Auth (CREATE VIA SUPABASE CONSOLE)

---

## **SUCCESS CRITERIA**

✅ All phases pass with no errors  
✅ Emails arrive within 2 seconds  
✅ Mobile view responsive  
✅ Admin tools work properly  
✅ Database data consistent  
✅ No 401/404 errors (except expected)  
✅ Performance < 2s page load  

**Ready to test? Start with Phase 1!**

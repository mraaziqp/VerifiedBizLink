# 🧪 ULTIMATE COMPREHENSIVE TEST SUITE

**Complete end-to-end verification of VerifiedBizLink application**

---

## PHASE 1: SETUP & VERIFICATION

### Step 1: Environment Check
```bash
# Verify all environment variables are set
echo "=== ENVIRONMENT VARIABLES ==="
cat .env.local | grep -E "DATABASE|NEXTAUTH|SUPABASE|API"

# Result: Should show DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### Step 2: Database Connectivity
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;" && echo "✅ Database connected" || echo "❌ Database failed"

# Check tables exist
psql $DATABASE_URL -c "\dt" | grep -E "users|vetting|admin"
```

### Step 3: Dependencies Check
```bash
# Verify all required packages installed
npm list bcrypt react next typescript postgres

# If any missing:
npm install bcrypt
npm install react next typescript postgres
```

### Step 4: Build Check
```bash
# Test TypeScript compilation
npm run build

# Expected: No errors, "Compiled successfully"
```

---

## PHASE 2: START DEV SERVER & INITIAL TESTS

### Step 5: Start Development Server
```bash
npm run dev

# Watch for:
# ✅ "ready - started server on 0.0.0.0:3000"
# ✅ No error messages
# ✅ All pages compile successfully
```

### Step 6: Server Health Check
```bash
# Open new terminal and test:
curl -s http://localhost:3000/api/health && echo "✅ Server healthy" || echo "❌ Server failed"

# Check response time
time curl -s http://localhost:3000 > /dev/null
```

---

## PHASE 3: PAGE FUNCTIONALITY TESTS

### TEST 1: HOME PAGE / HERO SECTION
**URL:** http://localhost:3000

**Test Steps:**
```
1. Page loads within 2 seconds
   Expected: Hero section visible with "Build Trust. Grow Together" text
   
2. Logo visible
   Expected: VB logo in top-left with cyan/purple gradient
   
3. Navigation menu present
   Expected: Pricing, About, Contact links visible
   
4. CTA buttons clickable
   Expected: "Get Verified Now" button (cyan)
   Expected: "View Plans" button (purple outline)
   
5. Responsive design check
   Expected: Hero section responsive on mobile
   Expected: Logo scaled appropriately
   
6. Trust badges visible
   Expected: CIPC Verified, SARS Compliant, Industry Trusted badges
   
7. Bottom stats section
   Expected: 4 stat cards (1,200+, 98%, 50+, 24/7)
   
8. No console errors
   Expected: Console clean (F12 → Console tab)
```

**Verification:**
- [ ] Hero loads quickly
- [ ] All text readable
- [ ] All buttons clickable
- [ ] Mobile responsive
- [ ] No console errors
- [ ] No broken images

---

### TEST 2: SIGNUP FLOW
**URL:** http://localhost:3000/signup

**Test Steps:**
```
STEP 1: BUSINESS DETAILS
1. Click on signup page
   Expected: 4-step form visible with progress bar at step 1
   
2. Form fields present
   Expected: Business Name input
   Expected: Business Category dropdown
   Expected: Description textarea
   Expected: Phone and Website inputs
   Expected: Business Email input
   
3. Try submitting empty form
   Expected: Error messages appear under each required field
   Expected: Red text saying "required"
   
4. Fill in valid data
   Expected: All fields accept input
   Expected: No errors with valid data
   Expected: "Next" button enabled
   
5. Click Next button
   Expected: Progress bar updates to step 2
   Expected: New form fields appear

STEP 2: LOCATION & SERVICE AREAS
1. See location fields
   Expected: City input (e.g., "Cape Town")
   Expected: Province dropdown (9 SA provinces)
   Expected: Service Radius slider (5-500 km)
   
2. Add multiple service areas
   Expected: Input field + "Add" button
   Expected: Can type "Johannesburg" and click add
   Expected: Area appears in list below
   Expected: Can add multiple areas
   Expected: Remove button (X) on each area
   
3. Click remove button
   Expected: Area removed from list
   
4. Add invalid data
   Expected: Can't add empty area
   Expected: Can't add duplicate area
   
5. Try next without service areas
   Expected: Error message "Add at least one service area"

STEP 3: PRODUCTS & SERVICES
1. See products section
   Expected: Input field + "Add" button
   Expected: Helper text "Add specific, searchable terms"
   
2. Add multiple products
   Expected: Can add "Web Development"
   Expected: Can add "Consulting"
   Expected: Can add "Training"
   Expected: All appear in list
   
3. Remove products
   Expected: Remove button works
   
4. Try next without products
   Expected: Error message "Add at least one product/service"

STEP 4: ACCOUNT CREATION
1. See account fields
   Expected: Email input
   Expected: Password input (min 8 chars guidance)
   Expected: Confirm password input
   Expected: Terms checkbox
   
2. Enter passwords that don't match
   Expected: Error "Passwords do not match"
   
3. Enter password too short
   Expected: Error "Password must be 8+ characters"
   
4. Don't accept terms
   Expected: Submit button disabled or error message
   
5. Fill all correctly
   Expected: All validations pass
   Expected: "Get Verified" button enabled
   
6. Click submit
   Expected: Loading state with spinner
   Expected: Success message after 2-5 seconds
   Expected: Redirect to verification page OR dashboard

FINAL CHECKS:
- [ ] All 4 steps work
- [ ] Back button works on steps 2-4
- [ ] Progress bar updates
- [ ] Validation messages clear
- [ ] No console errors
- [ ] Form data preserved when going back
- [ ] Can submit successfully
```

**Database Verification After Signup:**
```bash
# Check user created
psql $DATABASE_URL -c "SELECT id, email, business_name FROM users LIMIT 1;"

# Check vetting submission created
psql $DATABASE_URL -c "SELECT * FROM vetting_submissions LIMIT 1;"

# Check location/services saved
psql $DATABASE_URL -c "SELECT primary_location, service_areas, products_services FROM users LIMIT 1;"
```

---

### TEST 3: LOGIN FLOW
**URL:** http://localhost:3000/login

**Test Steps:**
```
1. Page loads
   Expected: Login form visible
   Expected: Email input
   Expected: Password input
   Expected: "Sign In" button
   
2. Try empty submit
   Expected: Browser validation ("Please fill out this field")
   
3. Try wrong email
   Expected: Error message "Invalid email or password"
   Expected: No hint which field is wrong (security)
   
4. Try wrong password
   Expected: Error message "Invalid email or password"
   
5. Try short email
   Expected: Browser validation
   
6. Login with correct credentials
   Expected: Loading spinner appears
   Expected: Redirected to dashboard after 1-2 seconds
   Expected: User's email visible in header
   
7. Check localStorage
   Expected: Session token saved (F12 → Application → Local Storage)
```

---

### TEST 4: USER DASHBOARD
**URL:** http://localhost:3000/dashboard

**Test Steps:**
```
HEADER SECTION:
1. User email visible
   Expected: Shows logged-in user's email
   
2. Logout button present
   Expected: Button in header
   Expected: Clicking logs out and redirects to login

TAB NAVIGATION:
1. Four tabs visible
   Expected: Overview, Ads, Subscription, Settings
   Expected: Active tab highlighted in cyan
   
2. Click each tab
   Expected: Content changes for each
   Expected: Tab highlight updates

OVERVIEW TAB:
1. Dashboard stats visible
   Expected: Active Ads count
   Expected: Monthly Revenue
   Expected: Total Impressions
   Expected: Current Plan badge
   
2. Chart visible
   Expected: Line chart showing impressions over 7 days
   Expected: X-axis shows days (Mon-Sun)
   Expected: Y-axis shows numbers
   
3. Upgrade card (if free user)
   Expected: "Upgrade to Premium" card visible
   Expected: Shows benefits
   Expected: "Upgrade Now" button clickable

ADS TAB:
1. Create Ad button visible
   Expected: Big button that opens dialog
   
2. Click "Create Ad"
   Expected: Modal opens with form
   Expected: 5-step process (Title → Description → Location → Duration → Review)
   Expected: Progress bar shows step 1
   
3. Enter ad title
   Expected: Can type in title field
   Expected: Character guidance visible
   
4. Next to description
   Expected: Can type detailed description
   
5. Next to location
   Expected: Location input
   Expected: Radius slider (100m-5km)
   Expected: Visual feedback for radius
   
6. Next to duration
   Expected: Duration dropdown (7, 14, 30, 60, 90 days)
   Expected: Price changes based on selection
   Expected: Shows "$10-$90" pricing
   
7. Next to review
   Expected: All data summarized
   Expected: "Publish Ad" button
   
8. Publish
   Expected: Success message
   Expected: Ad added to list

SUBSCRIPTION TAB:
1. Current tier shown
   Expected: Shows tier name (Free/Standard/Premium/Enterprise)
   Expected: Shows price if paid
   Expected: Shows status badge
   
2. Tier comparison visible
   Expected: 4 columns for each tier
   Expected: Current tier highlighted
   Expected: Features listed with checkmarks
   
3. Upgrade buttons
   Expected: Can click upgrade buttons
   Expected: Not active on current tier
   
4. FAQ section
   Expected: Questions and answers visible
   Expected: Can read all FAQ content

SETTINGS TAB:
1. Profile section
   Expected: Email field (read-only)
   Expected: Name input
   Expected: Company input
   Expected: Phone input
   
2. Notification preferences
   Expected: Email notifications toggle
   Expected: SMS notifications toggle
   Expected: Newsletter toggle
   
3. Security section
   Expected: Change password button
   Expected: 2FA button
   Expected: Manage devices button
   
4. Save button
   Expected: Saves changes
   Expected: Shows success message
   
5. Danger zone
   Expected: Delete account button (red)
```

---

### TEST 5: PRICING PAGE
**URL:** http://localhost:3000/pricing

**Test Steps:**
```
1. Page header
   Expected: "Simple, Transparent Pricing" title
   Expected: "Choose the perfect plan..." description
   
2. Four tier cards visible
   Expected: Basic Listing (Free)
   Expected: Verified Business (R99/month) - highlighted as "MOST POPULAR"
   Expected: Premium Business (R299/month)
   Expected: Enterprise Partner (R999/month)
   
3. Each card shows
   Expected: Tier name
   Expected: Price
   Expected: Description
   Expected: Feature list with checkmarks
   Expected: Action button (Get Started / Upgrade Now / Contact Sales)
   
4. Click buttons
   Expected: Redirect to signup or pricing info
   
5. FAQ section
   Expected: Multiple Q&A items
   Expected: Can read all content
   
6. Bottom CTA
   Expected: "Ready to get verified?" section
   Expected: "Get Started Now" button
```

---

### TEST 6: ADMIN DASHBOARD
**URL:** http://localhost:3000/admin/orchestrator (after admin login)

**Test Steps:**
```
ADMIN LOGIN:
1. Login with admin credentials
   Expected: Email: admin@verifiedbizlink.com
   Expected: Password: [your admin password]
   Expected: Successful login redirects to /admin/orchestrator

TAB STRUCTURE:
1. See admin tabs
   Expected: Overview, Tiers, Users, Payment Gateway tabs
   Expected: Possibly Vetting, Admin Users tabs
   
2. Click each tab
   Expected: Content changes
   Expected: Tab highlight updates

OVERVIEW TAB:
1. Stats visible
   Expected: Revenue chart
   Expected: User growth chart
   Expected: Key metrics

TIERS TAB:
1. List of tiers visible
   Expected: Table showing all 4 tiers
   Expected: Free, Standard, Premium, Enterprise
   Expected: Pricing in USD and ZAR
   Expected: Edit/Delete buttons
   
2. Create new tier
   Expected: "Create Tier" button
   Expected: Opens dialog with form
   Expected: Can add tier name, price, description
   Expected: Can set as active/inactive
   
3. Edit tier
   Expected: Click edit button
   Expected: Form opens with current data
   Expected: Can change price
   Expected: Can change features
   Expected: Changes save to database
   
4. Delete tier
   Expected: Delete button with confirmation
   Expected: Tier removed from list

USERS TAB:
1. User list visible
   Expected: Table of users
   Expected: Email, subscription tier, status
   Expected: Assign tier button
   
2. Assign tier to user
   Expected: Click "Assign" or similar
   Expected: Modal opens to select tier
   Expected: Can choose new tier
   Expected: Changes apply immediately

PAYMENT GATEWAY TAB:
1. Gateway status visible
   Expected: Stripe connection status
   Expected: PayPal connection status
   Expected: Can see if keys are configured
   
2. Edit keys
   Expected: Input fields for API keys
   Expected: Keys masked for security
   Expected: Save button
   Expected: Confirmation on save

VETTING TAB (if exists):
1. Pending verifications visible
   Expected: List of submissions
   Expected: Business names and IDs
   Expected: Status indicators (pending/approved/rejected)
   
2. Click submission
   Expected: Details panel opens
   Expected: Shows CIPC status
   Expected: Shows SARS status
   Expected: Admin notes field
   
3. Approve submission
   Expected: Click "Approve" button
   Expected: Optional notes
   Expected: Submission marked as approved
   Expected: User can now login
   
4. Reject submission
   Expected: Click "Reject" button
   Expected: Requires admin notes with reason
   Expected: Submission marked as rejected

ADMIN USERS TAB (if exists):
1. Admin list visible
   Expected: Table of admin users
   Expected: Email, username, role
   Expected: Created date
   
2. Edit admin
   Expected: Click edit button
   Expected: Can change email
   Expected: Can change username
   Expected: Save button
   Expected: Changes apply
   
3. Add new admin
   Expected: "Add Admin" button
   Expected: Modal opens
   Expected: Email, username, role fields
   Expected: Can create new admin user
   
4. Delete admin
   Expected: Delete button with confirmation
   Expected: Admin removed from system
```

---

## PHASE 4: RESPONSIVE DESIGN TESTS

### Mobile Test (Mobile View)
```bash
# In browser DevTools (F12):
# Click device toolbar (Ctrl+Shift+M)
# Set to iPhone 12 Pro (390px width)

TEST CHECKLIST:
1. Hero section
   [ ] Logo sized appropriately
   [ ] Text readable
   [ ] Buttons stack vertically
   [ ] No horizontal scroll
   
2. Signup form
   [ ] Form fields full width
   [ ] Progress bar visible
   [ ] All inputs accessible
   [ ] Buttons tappable (44px min height)
   [ ] No zoom needed to interact
   
3. Dashboard
   [ ] Tabs accessible
   [ ] Content readable
   [ ] Charts responsive
   [ ] No overflow
   
4. Admin pages
   [ ] Table scrollable horizontally if needed
   [ ] All buttons accessible
   [ ] Forms responsive
```

### Tablet Test
```bash
# DevTools → iPad (768px width)

TEST CHECKLIST:
1. Layout good on medium screen
2. Grid layouts work
3. Sidebars if present don't overflow
4. Navigation accessible
```

### Desktop Test
```bash
# Full screen (1920px+)

TEST CHECKLIST:
1. Hero section full height
2. All content visible without scrolling (above fold)
3. Sidebar navigation visible
4. Tables display well
5. Charts responsive
```

---

## PHASE 5: PERFORMANCE TESTS

### Load Time Test
```bash
# In browser DevTools → Lighthouse

Run Lighthouse audit:
[ ] Performance score > 90
[ ] Accessibility score > 90
[ ] Best Practices score > 90
[ ] SEO score > 90

Check specific metrics:
[ ] First Contentful Paint < 1.5s
[ ] Largest Contentful Paint < 2.5s
[ ] Cumulative Layout Shift < 0.1
```

### Network Performance
```bash
# In browser DevTools → Network tab
# Reload page and check:

[ ] All assets load (no 404s)
[ ] No failed requests
[ ] CSS loads < 100ms
[ ] JS loads < 200ms
[ ] Images optimized
[ ] No large files > 1MB
```

### API Response Time
```bash
# In Network tab, check API calls:
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/auth/login
Expected: < 100ms for simple queries
Expected: < 500ms for complex queries
```

---

## PHASE 6: CONSOLE ERROR CHECKS

### Open DevTools Console (F12)
```
Check for:
[ ] No red error messages
[ ] No yellow warnings (unless external)
[ ] No undefined variables
[ ] No 404 errors for assets
[ ] No CORS errors
[ ] No memory leaks

Run in console:
> console.error.toString()
Should show nothing for normal flow
```

---

## PHASE 7: SECURITY CHECKS

### Authentication Security
```bash
# Check password hashing
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","businessName":"Test"}'

Verify:
[ ] Password not in response
[ ] No sensitive data in response
[ ] HTTPS enforced in production
[ ] Session tokens secure (HttpOnly, Secure flags)
```

### Input Validation
```bash
# Test XSS prevention
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com",...}'

Expected: Input rejected or sanitized
```

---

## PHASE 8: DATABASE INTEGRITY CHECKS

### Check Data Consistency
```bash
psql $DATABASE_URL << EOF
-- Check users table
SELECT COUNT(*) as user_count FROM users;

-- Check vetting submissions
SELECT COUNT(*) as pending_count FROM vetting_submissions WHERE overall_status = 'pending';

-- Check service areas saved correctly
SELECT primary_location, service_areas, products_services FROM users LIMIT 1;

-- Check admin users
SELECT COUNT(*) as admin_count FROM admin_users;

-- Check for orphaned records
SELECT COUNT(*) FROM vetting_submissions WHERE business_id NOT IN (SELECT id FROM users);
EOF
```

---

## PHASE 9: OPTIMIZATION CHECKS

### Code Quality
```bash
# TypeScript compilation
npm run build
Expected: 0 errors, 0 warnings

# Check for unused code
grep -r "console.log" src/
Expected: Should be minimal or none

# Check for large bundles
npm run build
Look at: .next/server size
Expected: < 50MB
```

### Database Optimization
```bash
# Check indexes exist
psql $DATABASE_URL << EOF
SELECT * FROM pg_stat_user_indexes;
EOF

Expected: Indexes on frequently queried columns
```

---

## PHASE 10: FINAL CHECKLIST

### Critical Path
```
USER FLOW:
[ ] User can sign up
[ ] User receives verification pending message
[ ] Admin can see pending verification
[ ] Admin can approve/reject
[ ] User can login after approval
[ ] User can access dashboard
[ ] User can create ad
[ ] User can manage subscription
[ ] User can update settings

ADMIN FLOW:
[ ] Admin can login
[ ] Admin can see all tiers
[ ] Admin can edit tiers
[ ] Admin can see users
[ ] Admin can assign tiers
[ ] Admin can see vetting submissions
[ ] Admin can approve/reject
[ ] Admin can edit own credentials
[ ] Admin can manage other admins

GENERAL:
[ ] No console errors
[ ] All pages load fast
[ ] Mobile responsive
[ ] Desktop optimized
[ ] Database consistent
[ ] Security validated
```

---

## ISSUES FOUND & FIXES

### Common Issues & Solutions

**Issue:** "Cannot find module" error
**Solution:** `npm install` missing dependencies

**Issue:** Database connection fails
**Solution:** Check DATABASE_URL in .env.local, verify Neon is running

**Issue:** Pages 404
**Solution:** Check file paths, restart dev server

**Issue:** Form submission hangs
**Solution:** Check API route exists, check network tab for errors

**Issue:** Admin pages not accessible
**Solution:** Verify admin login, check role in database

**Issue:** Mobile layout broken
**Solution:** Check responsive classes (hidden sm:, md:, lg:), test with DevTools

---

## OPTIMIZATION RECOMMENDATIONS

Based on testing results, implement:

1. **Performance:**
   - Add image compression
   - Implement code splitting
   - Cache static assets

2. **UX:**
   - Add loading skeletons
   - Add toast notifications
   - Add form validation feedback

3. **Admin:**
   - Add bulk actions
   - Add filters/search
   - Add export functionality

4. **Security:**
   - Add rate limiting
   - Add CSRF protection
   - Add audit logging

---

## SUCCESS CRITERIA

Application is production-ready when:
✅ All 10 phases complete with 0 critical issues
✅ All user flows work end-to-end
✅ All admin features functional
✅ No console errors
✅ Mobile responsive
✅ Performance > 90
✅ Security validated
✅ Database consistent

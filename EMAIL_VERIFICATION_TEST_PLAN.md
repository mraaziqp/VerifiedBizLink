# Email Verification System - Complete Test Plan

## ✅ System Overview

### Components
1. **Signup Flow** → generates random token + sends verification email
2. **Email Service** → Resend API sends HTML email with verification link
3. **Verification Link** → Click link to verify token and mark `email_verified = true`
4. **Verification Status** → Banner shows for unverified users, banner disappears after verification
5. **Resend Flow** → Users can resend verification email if needed

---

## 🔍 Database Schema Check

### Required Fields in `users` table:
- ✅ `email_verified` (BOOLEAN, default FALSE)
- ✅ `email_verification_token` (VARCHAR(255), UNIQUE)
- ✅ `email_verified_at` (TIMESTAMPTZ, optional)

### Indexes Created:
- ✅ `idx_users_email_verification_token` on `email_verification_token`
- ✅ `idx_users_email_verified` on `email_verified`

**Run migration first:**
```bash
# This creates the required columns if missing
psql $DATABASE_URL -f migrations/004_add_email_verification_fields.sql
```

---

## 📧 Resend Configuration Check

### Environment Variables Required:
```env
RESEND_API_KEY="<REDACTED-rotate-in-Resend-dashboard>"
RESEND_FROM_EMAIL="noreply@verifiedbizlink.co.za"
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or production domain
```

### Verify API Key:
- ✅ Key is valid (generated from resend.com)
- ✅ Domain is verified in Resend dashboard
- ✅ Free tier (100 emails/day) is sufficient

---

## 🧪 Test Scenarios

### **Test 1: Signup with Email Verification**

**Steps:**
1. Go to `/signup`
2. Fill form:
   - Email: `testuser@example.com`
   - Password: `TestPass123!`
   - Full Name: `Test User`
   - Role: `Customer`
3. Click "Sign Up"

**Expected Results:**
- ✅ User created in database with `email_verified = false`
- ✅ `email_verification_token` is a random UUID
- ✅ Redirected to `/verify-email` page
- ✅ Page shows "Check your email" message
- ✅ Session cookie set (`vbl_session`)
- ✅ User is logged in but marked as unverified

**Verify in Database:**
```sql
SELECT id, email, email_verified, email_verification_token 
FROM users 
WHERE email = 'testuser@example.com';
```

Expected output:
```
id: [UUID]
email: testuser@example.com
email_verified: false
email_verification_token: [random-uuid]
```

---

### **Test 2: Email Delivery**

**Steps:**
1. Complete Test 1
2. Check inbox of `testuser@example.com`
3. Look for email from `VerifiedBizLink <noreply@verifiedbizlink.co.za>`

**Expected Results:**
- ✅ Email arrives within 30 seconds
- ✅ Subject: "Verify your VerifiedBizLink email address"
- ✅ Contains yellow "Verify My Email" button
- ✅ Contains fallback link: `http://localhost:3000/api/auth/verify-email?token=[TOKEN]`
- ✅ Contains expiration note: "This link expires in 24 hours"

**If email doesn't arrive:**
1. Check spam/junk folder
2. Verify `RESEND_API_KEY` in environment
3. Check Resend dashboard for errors
4. Verify domain is verified in Resend

---

### **Test 3: Email Verification - Click Link**

**Steps:**
1. Complete Test 2
2. Click "Verify My Email" button OR copy and visit the token link
3. Verify it opens successfully

**Expected Results:**
- ✅ Link is clicked
- ✅ Page shows "Email verified!" with checkmark icon
- ✅ After 4 seconds, redirects to home `/`
- ✅ User is now logged in
- ✅ No more verification banner

**Verify in Database:**
```sql
SELECT id, email, email_verified, email_verification_token 
FROM users 
WHERE email = 'testuser@example.com';
```

Expected output:
```
id: [UUID]
email: testuser@example.com
email_verified: true
email_verification_token: NULL  ← cleared after verification
```

---

### **Test 4: Invalid/Expired Token**

**Steps:**
1. Visit verification link with fake token:
   `http://localhost:3000/api/auth/verify-email?token=invalid-token-123`

**Expected Results:**
- ✅ Page shows "Verification failed"
- ✅ Shows error: "This verification link is invalid or has already been used"
- ✅ Button to "Send a new verification email"

---

### **Test 5: Resend Verification Email**

**Steps:**
1. Stay on `/verify-email` page from Test 1
2. Click "Resend verification email" button
3. Check inbox again

**Expected Results:**
- ✅ Button shows loading spinner while sending
- ✅ After 1-2 seconds: "Verification email resent!"
- ✅ New email arrives with new token
- ✅ Old token is invalidated
- ✅ Previous token no longer works

**Verify in Database:**
```sql
SELECT email_verification_token FROM users WHERE email = 'testuser@example.com';
```

Expected: Old token is replaced with new token

---

### **Test 6: Verification Banner**

**Steps:**
1. Create new test account: `banner-test@example.com`
2. DON'T verify the email
3. Navigate to home page `/`

**Expected Results:**
- ✅ Amber banner appears at top of page
- ✅ Shows: "Please verify your email address to secure your account."
- ✅ Has "Resend" button
- ✅ Has "X" dismiss button
- ✅ Banner uses amber/yellow colors

**Steps:**
1. Click "Resend" button
2. Check email
3. Verify email by clicking link

**Expected Results:**
- ✅ After verification, banner disappears
- ✅ User sees app without banner

---

### **Test 7: Multiple Resend Attempts**

**Steps:**
1. Create account with `multi-resend@example.com`
2. Click "Resend" button 5 times rapidly

**Expected Results:**
- ✅ Rate limit triggers (max 3 resends per 5 minutes)
- ✅ 4th and 5th attempts fail with: "Too many requests"
- ✅ Error shows after 300 seconds (5 minutes)

---

### **Test 8: Session Persistence**

**Steps:**
1. Create account and verify email
2. Close browser
3. Visit app again
4. Session cookie should restore

**Expected Results:**
- ✅ User is still logged in (no banner)
- ✅ `emailVerified = true` in session
- ✅ No need to reverify

---

### **Test 9: Business Signup Email Verification**

**Steps:**
1. Go to `/signup`
2. Select "Business" role
3. Fill form with:
   - Email: `business@test.co.za`
   - Company Name: `Test Company`
   - CIPC #: `K123456789`
4. Click "Sign Up"

**Expected Results:**
- ✅ Business is created in database
- ✅ User is marked as `email_verified = false`
- ✅ Verification email is sent
- ✅ Email is branded for business user
- ✅ Same verification flow as customer

---

### **Test 10: Admin Account Already Verified**

**Steps:**
1. Login as Ramone: `ramone@verifiedbizlink.co.za` / `Ramone@123456`
2. Navigate admin pages

**Expected Results:**
- ✅ No verification banner
- ✅ `email_verified = true` in database
- ✅ No verification interruptions

---

## 🔒 Security Checks

### **Check 1: Token Uniqueness**
```sql
SELECT COUNT(*), email_verification_token 
FROM users 
WHERE email_verification_token IS NOT NULL 
GROUP BY email_verification_token 
HAVING COUNT(*) > 1;
```
Result should be empty (no duplicate tokens)

### **Check 2: Token Is One-Time Use**
- After clicking verification link, token is set to NULL
- Clicking same link again fails

### **Check 3: Token Cannot Be Guessed**
- Token is UUID (128-bit random)
- Not sequential or predictable

### **Check 4: Rate Limiting**
- Max 5 signup attempts per IP per 15 minutes
- Max 3 resend attempts per IP per 5 minutes

### **Check 5: Link Expiration**
- Links valid for 24 hours
- After 24 hours, need to resend
- (Currently not enforced in code - see Enhancement #1 below)

---

## ⚠️ Known Issues & Fixes

### **Issue 1: Token Expiration Not Enforced**
**Status:** ⚠️ MINOR
**Description:** Verification links don't expire after 24 hours
**Fix:** Add `email_verification_token_created_at` column and check in verify endpoint

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_created_at TIMESTAMPTZ;
```

**Updated verify endpoint:**
```typescript
// In /api/auth/verify-email
const user = await db`...`;
const age = Date.now() - new Date(user.email_verification_token_created_at).getTime();
if (age > 24 * 60 * 60 * 1000) {
  return NextResponse.redirect(new URL('/verify-email?error=expired', request.url));
}
```

### **Issue 2: Email Failures Are Silent**
**Status:** ⚠️ MINOR
**Description:** If email fails to send, user won't know
**Fix:** Return `emailSendStatus` in signup response

```typescript
// In /api/auth/signup
const emailResult = await sendVerificationEmail(...);
if (!emailResult.ok) {
  console.warn('Email send failed but signup succeeded');
  // Can still show warning banner or retry
}
```

---

## 📋 Checklist - Ready for Production?

### Database Setup
- [ ] Run migration 004: `psql $DATABASE_URL -f migrations/004_add_email_verification_fields.sql`
- [ ] Verify columns exist: `\d users` (check for `email_verified`, `email_verification_token`)
- [ ] Verify indexes exist: `\di` (check for `idx_users_email_*`)

### Environment Variables
- [ ] `RESEND_API_KEY` is set and valid
- [ ] `RESEND_FROM_EMAIL` is "noreply@verifiedbizlink.co.za"
- [ ] `NEXT_PUBLIC_APP_URL` matches your domain

### API Endpoints
- [ ] `POST /api/auth/signup` — creates user with token
- [ ] `GET /api/auth/verify-email?token=...` — verifies and redirects
- [ ] `POST /api/auth/resend-verification` — sends new email
- [ ] `GET /api/auth/me` — returns `emailVerified` status

### UI Components
- [ ] `/verify-email` page loads and shows correct state
- [ ] Email verification banner displays for unverified users
- [ ] "Resend" button works without errors
- [ ] Success/error messages are clear
- [ ] Styling matches brand (amber colors for banner)

### Testing Completed
- [ ] Test 1: Signup with verification ✅
- [ ] Test 2: Email delivery ✅
- [ ] Test 3: Click link and verify ✅
- [ ] Test 4: Invalid token handling ✅
- [ ] Test 5: Resend email ✅
- [ ] Test 6: Verification banner ✅
- [ ] Test 7: Rate limiting ✅
- [ ] Test 8: Session persistence ✅
- [ ] Test 9: Business signup ✅
- [ ] Test 10: Admin accounts ✅

### Security Verified
- [ ] Tokens are unique (UUID)
- [ ] Tokens are one-time use
- [ ] Tokens cannot be guessed
- [ ] Rate limiting prevents abuse
- [ ] No verification info leakage

### Monitoring & Logging
- [ ] Console logs capture email failures
- [ ] Database audit logs verification actions
- [ ] Error tracking (Sentry/similar) set up
- [ ] Email delivery tracked in Resend dashboard

---

## 🚀 Deployment Checklist

Before deploying to production:

```bash
# 1. Apply database migration
psql $DATABASE_URL -f migrations/004_add_email_verification_fields.sql

# 2. Verify Resend domain
# Go to https://resend.com → Domains → verify noreply@verifiedbizlink.co.za

# 3. Set production environment variables
export RESEND_API_KEY="[production-key]"
export NEXT_PUBLIC_APP_URL="https://www.verifiedbizlink.co.za"

# 4. Run full test suite
npm test -- --testPathPattern="email|verification|signup"

# 5. Build and test
npm run build
npm start

# 6. Manual smoke test
# Sign up with test email → verify email → check banner disappears

# 7. Deploy
git push origin main  # Triggers CI/CD on Vercel
```

---

## 📊 Monitoring

### Daily Checks
- [ ] Check Resend dashboard for bounces
- [ ] Check for unverified account buildup
- [ ] Monitor signup success rate

### Weekly Checks
- [ ] Review Resend delivery rate (should be >98%)
- [ ] Check for orphaned tokens in database
- [ ] Review error logs for verify endpoint failures

### Monthly Checks
- [ ] Analyze verified vs unverified user ratio
- [ ] Check email verification completion rate
- [ ] Plan for any needed improvements

---

## 🎯 Success Criteria

✅ **Email verification flow is flawless when:**
1. Emails arrive within 30 seconds
2. Verification links are clickable and work
3. No false positives or false negatives
4. Rate limiting prevents abuse
5. Banner correctly reflects verification status
6. Resend flow works reliably
7. No broken links or errors
8. Database stays consistent
9. Logs track all actions
10. No security vulnerabilities

**All criteria met = Production ready!**

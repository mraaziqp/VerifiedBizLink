# 🚀 SUPABASE FINAL SETUP & ADMIN ACCOUNT SEEDING

**Complete guide to set up Supabase and create admin test accounts**

---

## **PART 1: GET SERVICE ROLE KEY (5 min)**

### **Step 1: Open Supabase Dashboard**
1. Go to: https://app.supabase.com
2. Select project: **hllycop**
3. Click **Settings** (bottom left)
4. Click **API** tab

### **Step 2: Copy Service Role Secret**
- Look for **Service Role Secret** (NOT the Anon key)
- Click **Copy** button
- ⚠️ **IMPORTANT:** This is sensitive - never share it publicly
- Save it in a safe place for now

---

## **PART 2: UPDATE ENVIRONMENT VARIABLES**

You'll add the Service Role Key to `.env.local`:

1. Open `.env.local` in your project
2. Add this line (paste your key):
```
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-here"
```

**Example:**
```
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## **PART 3: VERIFY DATABASE TABLES (2 min)**

### **Check Supabase Console:**

1. Go to Supabase: https://app.supabase.com
2. Select **hllycop** project
3. Click **SQL Editor** (left sidebar)
4. You should see all 13 tables:

**✅ Expected Tables:**
- [ ] `auth.users` (Supabase Auth)
- [ ] `public.users` (Custom user profiles)
- [ ] `public.posts` (Feed posts)
- [ ] `public.comments` (Post comments)
- [ ] `public.favorites` (Favorite businesses)
- [ ] `public.saved_posts` (Saved posts)
- [ ] `public.following` (Follow relationships)
- [ ] `public.user_notifications` (Notifications)
- [ ] `public.search_history` (Search history)
- [ ] `public.post_analytics` (Post stats)
- [ ] `public.business_tweets` (Tweet management)
- [ ] `public.tweet_analytics` (Tweet stats)
- [ ] `public.business_advertisements` (Ad system)

**If tables are missing:**
1. Go to **SQL Editor**
2. Copy all SQL from `database-migrations.sql`
3. Paste into SQL Editor
4. Click **Run**

---

## **PART 4: VERIFY RLS POLICIES**

RLS (Row Level Security) policies should be enabled:

### **Check in Supabase:**
1. Click **Authentication** (left sidebar)
2. Click **Policies** tab
3. You should see policies for tables like:
   - `favorites` - Allow users to read their own favorites
   - `saved_posts` - Allow users to read their own saves
   - `following` - Allow users to see followers
   - `user_notifications` - Allow users to read own notifications
   - etc.

**If no policies show:**
1. Run the migrations again (see Part 3)
2. Policies are created in the SQL migrations

---

## **PART 5: RESTART DEV SERVER**

Your `.env.local` now has the Service Role Key.

```bash
# Kill current dev server (Ctrl+C)

# Restart with new environment variables:
npm run dev
```

Server should start on: http://localhost:9002

---

## **PART 6: SEED ADMIN ACCOUNTS**

### **Option A: Use API Endpoint (Recommended)**

```bash
curl -X POST http://localhost:9002/api/setup/seed-accounts \
  -H "Content-Type: application/json" \
  -d '{"setupSecret": "<REDACTED-generate-a-new-random-secret-do-not-commit>"}'
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    {
      "email": "ramoen@verifiedbizlink.co.za",
      "role": "admin",
      "status": "created",
      "password": "TestPass123!"
    },
    {
      "email": "wesley@verifiedbizlink.co.za",
      "role": "banker",
      "status": "created",
      "password": "TestPass123!"
    }
  ],
  "credentials": {
    "ramoen": {
      "email": "ramoen@verifiedbizlink.co.za",
      "password": "TestPass123!",
      "role": "admin"
    },
    "wesley": {
      "email": "wesley@verifiedbizlink.co.za",
      "password": "TestPass123!",
      "role": "banker"
    }
  }
}
```

### **Option B: Run TypeScript Script**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://hllycop.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-key-here \
npx ts-node scripts/seed-admin-accounts.ts
```

---

## **PART 7: VERIFY IN SUPABASE**

After seeding, check that accounts were created:

### **Check Auth Users:**
1. Go to Supabase
2. Click **Authentication** → **Users**
3. You should see:
   - `ramoen@verifiedbizlink.co.za` ✅
   - `wesley@verifiedbizlink.co.za` ✅

### **Check User Profiles:**
1. Click **SQL Editor**
2. Run:
```sql
SELECT id, email, full_name, role FROM public.users 
WHERE email LIKE '%ramoen%' OR email LIKE '%wesley%';
```

**Expected Output:**
```
id                  | email                              | full_name           | role
------------------- | ---------------------------------- | ------------------- | ------
<uuid>              | ramoen@verifiedbizlink.co.za       | Ramoen - Lead Admin  | admin
<uuid>              | wesley@verifiedbizlink.co.za       | Wesley - Banking... | banker
```

---

## **PART 8: TEST LOGIN**

### **Test Ramoen (Admin):**

1. Go to: http://localhost:9002/login
2. Enter:
   - Email: `ramoen@verifiedbizlink.co.za`
   - Password: `TestPass123!`
3. Click **Sign In Securely**

**Expected:**
- ✅ Login succeeds
- ✅ Redirected to dashboard
- ✅ See "👑 Admin Control Center"
- ✅ 6 admin tools visible:
  - Business Verification
  - Vetting Queue
  - User Management
  - Platform Analytics
  - Network Status
  - Settings

### **Test Wesley (Banker):**

1. Logout (click profile → Logout)
2. Login with:
   - Email: `wesley@verifiedbizlink.co.za`
   - Password: `TestPass123!`

**Expected:**
- ✅ Login succeeds
- ✅ See "🏦 Banking Portal"
- ✅ 3 banking tools visible:
  - Business Vetting Portal
  - Legal Compliance
  - Team Management

---

## **PART 9: VERIFY RLS POLICIES ARE WORKING**

### **Test User Isolation:**

1. Login as Ramoen
2. Go to `/admin/verify`
3. You should see:
   - Your email: `ramoen@verifiedbizlink.co.za`
   - Your role: `admin`
   - Can see admin tools only

**If you see "Access Denied":**
- Email detection might be case-sensitive
- Check `.env.local` is updated
- Restart server
- Clear browser cache (Ctrl+Shift+Delete)

---

## **CHECKLIST: EVERYTHING CONFIGURED?**

### **✅ Environment Variables**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `SETUP_SECRET` set to `"<REDACTED-generate-a-new-random-secret-do-not-commit>"`
- [ ] `RESEND_API_KEY` set
- [ ] Dev server restarted

### **✅ Supabase Setup**
- [ ] All 13 database tables created
- [ ] RLS policies enabled
- [ ] Storage bucket configured (for image uploads)
- [ ] Verified in SQL Editor

### **✅ Admin Accounts Created**
- [ ] Ramoen account created
- [ ] Wesley account created
- [ ] Accounts visible in Auth → Users
- [ ] User profiles in database
- [ ] Business profiles created

### **✅ Login Works**
- [ ] Ramoen can login
- [ ] Ramoen sees admin dashboard
- [ ] Wesley can login
- [ ] Wesley sees banking dashboard

### **✅ Role-Based Access**
- [ ] Ramoen sees 6 admin tools
- [ ] Wesley sees 3 banking tools
- [ ] You (super admin) see all 9 tools
- [ ] Role detection works

---

## **TROUBLESHOOTING**

### **"Invalid credentials" on login**
- **Cause:** Accounts not created
- **Fix:** Run seed endpoint or script again
- **Check:** Verify in Supabase Auth → Users

### **Service Role Key error**
- **Cause:** Key not set or invalid
- **Fix:** Get fresh key from Supabase → Settings → API
- **Paste:** Into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### **Tables don't exist**
- **Cause:** Migrations not run
- **Fix:** Copy SQL from `database-migrations.sql`
- **Run:** Paste in Supabase SQL Editor → Click Run

### **Access Denied when accessing /admin/dashboard**
- **Cause:** Role detection not working
- **Fix:** Clear browser cache and try again
- **Check:** Email must contain "ramoen" for admin role

### **Manifest.json error**
- **Cause:** PWA caching issue
- **Fix:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- **Still broken:** Clear browser cache completely

---

## **WHAT YOU'LL HAVE AFTER THIS**

✅ **Full Production Setup:**
- Database with 13 tables
- RLS policies for data security
- Admin accounts configured
- Role-based access control working
- Image upload to Supabase ready
- Email sending configured
- Ready for comprehensive testing

✅ **Test Accounts:**
- Ramoen (Admin) - Full access to vetting tools
- Wesley (Banker) - Banking portal access
- You (Super Admin) - All tools visible

✅ **Security:**
- Service role key secured in .env.local
- RLS policies protecting user data
- Role-based access enforced
- Email verification enabled

---

## **NEXT STEPS**

1. ✅ Get Service Role Key from Supabase
2. ✅ Add to `.env.local`
3. ✅ Restart dev server
4. ✅ Run seed endpoint
5. ✅ Test login as Ramoen
6. ✅ Verify admin dashboard works
7. ✅ Test login as Wesley
8. ✅ Verify banking portal works
9. ✅ Start comprehensive testing

---

**Once this is complete, the app is ready for production testing!** 🚀

For questions, check the troubleshooting section or review SETUP_ADMIN_ACCOUNTS.md for additional detail.

# 🔐 NEON DATABASE - ADMIN ACCOUNT SETUP GUIDE

**Complete guide to create admin accounts in Neon with roles and RLS policies**

---

## 👑 **ADMIN ACCOUNTS TO CREATE**

### **1. RAMOEN (Admin)**
```
Email:     ramoen@verifiedbizlink.co.za
Role:      admin
Access:    All vetting and verification tools
Tools:     Business Verification, Vetting Queue, User Management, 
           Analytics, Network Status, Settings
```

### **2. WESLEY (Banker)**
```
Email:     wesley@verifiedbizlink.co.za
Role:      banker
Access:    Banking and compliance tools
Tools:     Business Vetting Portal, Legal Compliance, Team Management
```

### **3. YOU (Super Admin)**
```
Email:     mraaziqp@gmail.com
Role:      admin
Access:    All tools - full access
Tools:     All 9 admin and banking tools
```

---

## 🚀 **METHOD 1: API ENDPOINT (Easiest)**

Call the seeding endpoint from your deployed app:

### **Step 1: Make the API Call**

```bash
curl -X POST https://www.verifiedbizlink.co.za/api/setup/seed-neon-admins \
  -H "Content-Type: application/json" \
  -d '{"setupSecret": "<REDACTED-generate-a-new-random-secret-do-not-commit>"}'
```

Or from browser console:

```javascript
fetch('https://www.verifiedbizlink.co.za/api/setup/seed-neon-admins', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ setupSecret: '<REDACTED-generate-a-new-random-secret-do-not-commit>' })
})
.then(r => r.json())
.then(console.log);
```

### **Step 2: Expected Response**

```json
{
  "success": true,
  "message": "Neon admin accounts created successfully",
  "admins_created": 3,
  "credentials": {
    "ramoen": {
      "email": "ramoen@verifiedbizlink.co.za",
      "role": "admin",
      "access": "All vetting and verification tools"
    },
    "wesley": {
      "email": "wesley@verifiedbizlink.co.za",
      "role": "banker",
      "access": "Banking and compliance tools"
    },
    "superAdmin": {
      "email": "mraaziqp@gmail.com",
      "role": "admin",
      "access": "All tools and full access"
    }
  },
  "rls_enabled": true,
  "policies_created": true
}
```

---

## 🔧 **METHOD 2: NEON CONSOLE (Manual)**

If you prefer to set up manually:

### **Step 1: Open Neon Console**

1. Go to: https://console.neon.tech
2. Select your project: `zfiidmgfgimkgpcyolg`
3. Click **SQL Editor**
4. Paste the content of `scripts/seed-neon-admins.sql`
5. Click **Run**

The script will:
- ✅ Create 3 admin accounts
- ✅ Enable RLS on 8 tables
- ✅ Create RLS policies
- ✅ Display admin access matrix

---

## 📝 **METHOD 3: TYPESCRIPT SCRIPT (Local)**

Run the TypeScript script locally:

### **Step 1: Set Environment**

```bash
export DATABASE_URL="<REDACTED-rotate-in-Neon-console-full-connection-string>"
```

### **Step 2: Run Script**

```bash
cd k:\Projects\VerifiedBizLink
npm install pg  # if not already installed
npx ts-node scripts/seed-neon-admins.ts
```

### **Step 3: See Output**

```
🌱 Starting Neon admin account seeding...

✅ Created: ramoen@verifiedbizlink.co.za
   Role: admin
   Access: Admin - All vetting and verification tools

✅ Created: wesley@verifiedbizlink.co.za
   Role: banker
   Access: Banker - Banking and compliance tools

✅ Created: mraaziqp@gmail.com
   Role: admin
   Access: Super Admin - All tools and full access

🔐 Configuring Row Level Security (RLS)...

✅ RLS enabled: public.users
✅ RLS enabled: public.posts
✅ RLS enabled: public.comments
...

✅ Admin Account Seeding Complete!
```

---

## 🔐 **ROW LEVEL SECURITY (RLS) POLICIES**

The script creates these security policies:

### **Users Table**
```
✅ "Users can view all profiles"
   - Anyone authenticated can view all user profiles

✅ "Users can update own profile"
   - Users can only update their own profile

✅ "Admins can update any user"
   - Admins can update any user profile
```

### **Posts Table**
```
✅ "Anyone can view posts"
   - Any authenticated user can view all posts

✅ "Users can manage own posts"
   - Users can only edit/delete their own posts

✅ "Admins can delete any posts"
   - Admins can delete any post
```

### **Comments Table**
```
✅ "Anyone can view comments"
   - Any authenticated user can view comments

✅ "Users can manage own comments"
   - Users can only edit/delete their own comments
```

### **Other Tables**
```
✅ "Favorites" - Users can only manage own
✅ "Saved Posts" - Users can only manage own
✅ "Following" - Users can only manage own following
✅ "Notifications" - Users can only see own notifications
✅ "Search History" - Users can only manage own
```

---

## 🔑 **ADMIN ACCESS MATRIX**

After setup, here's what each admin can access:

### **Ramoen (admin role)**
```
✅ Business Verification   - Verify and approve businesses
✅ Vetting Queue           - Manage vetting requests
✅ User Management         - Manage all users
✅ Platform Analytics      - View all analytics
✅ Network Status          - Monitor system health
✅ Settings                - Configure platform
```

### **Wesley (banker role)**
```
✅ Business Vetting Portal - Review vetting requests
✅ Legal Compliance        - Monitor compliance
✅ Team Management         - Manage team members
```

### **You (admin role)**
```
✅ All 9 tools             - Full access to everything
✅ Super Admin access      - Can manage all admins
```

---

## ✅ **VERIFICATION QUERIES**

Check if admin accounts were created:

### **In Neon Console:**

```sql
-- List all admin accounts
SELECT email, full_name, role, created_at
FROM public.users
WHERE role IN ('admin', 'banker')
ORDER BY role DESC;

-- Count admins by role
SELECT role, COUNT(*) as count
FROM public.users
WHERE role IN ('admin', 'banker')
GROUP BY role;

-- Check RLS policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename IN ('users', 'posts', 'comments')
ORDER BY tablename;
```

---

## 🔄 **TESTING ADMIN ACCESS**

After creating accounts, test the access:

### **Step 1: Login as Ramoen**

1. Go to: https://www.verifiedbizlink.co.za/login
2. Email: `ramoen@verifiedbizlink.co.za`
3. (Password: Use Supabase Auth)
4. You should see: "👑 Admin Control Center"
5. You should see 6 admin tools

### **Step 2: Login as Wesley**

1. Email: `wesley@verifiedbizlink.co.za`
2. You should see: "🏦 Banking Portal"
3. You should see 3 banking tools

### **Step 3: Login as You**

1. Email: `mraaziqp@gmail.com`
2. You should see: "⭐ Super Admin Dashboard"
3. You should see all 9 tools

---

## 📊 **ADMIN ROLES DATABASE SCHEMA**

```sql
-- Users table with role column
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  -- Possible values: 'user', 'admin', 'banker', 'customer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
```

---

## 🛡️ **DATA ISOLATION & SECURITY**

Each admin account has:

```
✅ Isolated user data (can't see other users' private data)
✅ Role-based access control (different tools per role)
✅ RLS policies (database enforces access rules)
✅ Audit trail ready (can add logging)
✅ Encryption in transit (SSL/TLS)
✅ Password security (bcrypt via Supabase)
```

---

## 📋 **SETUP CHECKLIST**

- [ ] Run one of the seeding methods (API / Manual / Script)
- [ ] Verify response shows "success: true"
- [ ] Check 3 admin accounts created
- [ ] Verify RLS policies enabled
- [ ] Test login as Ramoen
- [ ] Test login as Wesley
- [ ] Verify dashboards load correctly
- [ ] Check admin tools are accessible
- [ ] Verify data isolation works

---

## 🚀 **NEXT STEPS**

After setting up admin accounts:

1. ✅ Admins can log in and access their tools
2. ✅ Ramoen can start verifying businesses
3. ✅ Wesley can manage banking compliance
4. ✅ You have full super admin access
5. ✅ Regular users see only their own data
6. ✅ All data protected by RLS policies
7. ✅ App ready for production use

---

## 📞 **TROUBLESHOOTING**

### **"Invalid setup secret" error**
```
Cause: Wrong SETUP_SECRET value
Fix: Use: <REDACTED-generate-a-new-random-secret-do-not-commit>
```

### **"Connection error" in API call**
```
Cause: DATABASE_URL not set in Vercel
Fix: Add DATABASE_URL to Vercel env vars
```

### **Admins can't login after creation**
```
Cause: Supabase Auth doesn't have the accounts
Fix: Create accounts via Supabase Auth signup first
Then script syncs them to Neon
```

### **"Table does not exist" error**
```
Cause: Database tables not created
Fix: Run database migrations first
Command: DATABASE_URL="..." npm run migrations
```

---

## ✨ **FINAL STATUS**

After completing this setup:

```
✅ 3 admin accounts created in Neon
✅ Roles configured (admin, banker)
✅ RLS policies enforced
✅ Access control working
✅ Data isolation active
✅ Dashboards accessible
✅ Ready for production
```

---

**Admin setup complete! Your app is production-ready.** 🎉

# 🔐 QUICK FIX: Auth & Database Setup

## ❌ **Current Problem**

```
- Manifest.json: Caching issue (not a real error)
- /api/auth/login: 401 - No users exist in Supabase Auth
- /api/auth/me: 401 - Not authenticated
- Invalid credentials: Users not created yet
```

---

## ✅ **SOLUTION: 3 Steps to Get Working**

### **Step 1: Clear Browser Cache** (2 min)

Hard refresh to clear manifest cache:
- **Windows/Chrome:** `Ctrl + Shift + Delete`
- **Mac/Chrome:** `Cmd + Shift + Delete`
- **Firefox:** `Ctrl + Shift + Delete`
- **Safari:** Develop → Empty Caches

OR go to DevTools → Application → Clear Site Data

---

### **Step 2: Create Test User via Supabase** (3 min)

Go directly to Supabase to create a user:

1. Open: https://app.supabase.com
2. Select project: `zfiidmgfgimkgpcyolg`
3. Click **Authentication** → **Users**
4. Click **+ Create user** (top right)
5. Fill in:
   ```
   Email:             test@example.com
   Password:          TestPass123!
   Confirm password:  TestPass123!
   Auto confirm:      ✓ (check the box)
   ```
6. Click **Save user**

---

### **Step 3: Test Login** (2 min)

1. Go to: https://www.verifiedbizlink.co.za/login
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R)
4. Login with:
   ```
   Email:    test@example.com
   Password: TestPass123!
   ```
5. You should be logged in!

---

## 🎯 **Create Your Admin Accounts**

Once login works, create these users in Supabase:

### **Ramoen (Admin)**
```
Email:    ramoen@verifiedbizlink.co.za
Password: TestPass123!
Auto confirm: ✓
```

### **Wesley (Banker)**
```
Email:    wesley@verifiedbizlink.co.za
Password: TestPass123!
Auto confirm: ✓
```

### **You (Super Admin)**
```
Email:    mraaziqp@gmail.com
Password: Your chosen password
Auto confirm: ✓
```

---

## 📊 **Seed Admin Roles in Neon Database**

After creating accounts, seed the roles:

```bash
curl -X POST https://www.verifiedbizlink.co.za/api/setup/seed-neon-admins \
  -H "Content-Type: application/json" \
  -d '{"setupSecret": "<REDACTED-generate-a-new-random-secret-do-not-commit>"}'
```

---

## 🗄️ **Database Migration**

Run the Neon admin setup SQL:

1. Go to: https://console.neon.tech
2. Select project
3. Click **SQL Editor**
4. Paste content from `scripts/seed-neon-admins.sql`
5. Click **Run**

---

## ✨ **After Setup**

You should be able to:
- ✅ Login with test@example.com
- ✅ Access dashboard
- ✅ Admin sees all tools (after seeding roles)
- ✅ Everything working!

---

## 🔍 **Why This Happens**

```
Signup Form (Client)
    ↓
Supabase Auth creates user
    ↓
User exists in auth.users table
    ↓
Login works
    ↓
Neon user profile created (optional, via API)
```

The app assumes users exist. Create them first, then login!

---

## 📝 **Summary**

| Step | Action | Time |
|------|--------|------|
| 1 | Clear browser cache | 2 min |
| 2 | Create test user in Supabase | 3 min |
| 3 | Test login | 2 min |
| 4 | Create admin accounts | 3 min |
| 5 | Seed roles (optional) | 2 min |

**Total: ~12 minutes to fully working system** ✅

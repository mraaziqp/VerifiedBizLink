# 🔐 Setup Admin Test Accounts

This guide explains how to create test accounts for Ramoen (admin) and Wesley (banker).

---

## **Quick Setup - 2 Options**

### **Option 1: API Endpoint (Easiest)** ✨

Make a POST request to create accounts:

```bash
curl -X POST http://localhost:9002/api/setup/seed-accounts \
  -H "Content-Type: application/json" \
  -d '{"setupSecret": "your-setup-secret"}'
```

**Response:**
```json
{
  "success": true,
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

---

### **Option 2: Script (Manual)**

Run the seed script:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://hllycop.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npx ts-node scripts/seed-admin-accounts.ts
```

---

## **Test Credentials Created**

### **Ramoen (Admin)**
```
Email:    ramoen@verifiedbizlink.co.za
Password: TestPass123!
Role:     admin
```

**Will see:**
- ✅ Admin Control Center
- ✅ Business Verification tool
- ✅ Vetting Queue tool
- ✅ User Management tool
- ✅ Platform Analytics tool
- ✅ Network Status tool
- ✅ Settings

---

### **Wesley (Banker)**
```
Email:    wesley@verifiedbizlink.co.za
Password: TestPass123!
Role:     banker
```

**Will see:**
- ✅ Banking Specialist Portal
- ✅ Business Vetting Portal
- ✅ Legal Compliance tool
- ✅ Team Management tool

---

### **You (Super Admin)**
```
Email:    mraaziqp@gmail.com
Role:     super admin (all tools)
```

**Will see:**
- ✅ All 9 tools (both admin and banking)
- ✅ Super Admin Dashboard

---

## **After Creating Accounts**

1. **Login:** Go to https://www.verifiedbizlink.co.za/login
2. **Enter credentials** for Ramoen or Wesley
3. **You'll be redirected** to their admin dashboard automatically
4. **Access their tools** - all 6 admin tools or 3 banking tools

---

## **What Gets Created**

When you seed accounts, this is created:

1. **Supabase Auth User**
   - Email: ramoen@verifiedbizlink.co.za
   - Password: TestPass123!
   - Email verified: Yes

2. **User Profile** (in `users` table)
   - id: UUID
   - email: ramoen@verifiedbizlink.co.za
   - full_name: Ramoen - Lead Admin
   - role: admin

3. **Business Profile** (in `businesses` table)
   - user_id: linked to user
   - company_name: Ramoen Verification Co
   - status: active

---

## **Where to Get SETUP_SECRET**

The `SETUP_SECRET` is used to protect the seed endpoint from unauthorized access.

**For development:**
- Set it in your `.env.local`: `SETUP_SECRET=dev-secret-123`
- Use the same value in API calls

**For production:**
- Set a strong secret in Vercel environment variables
- Use that secret when seeding

---

## **If Accounts Already Exist**

If you run the seed endpoint again and accounts already exist:

```json
{
  "results": [
    {
      "email": "ramoen@verifiedbizlink.co.za",
      "status": "exists",
      "message": "Account already exists"
    }
  ]
}
```

The endpoint will skip creating duplicates. To reset:

1. Delete users from Supabase Auth
2. Delete user profiles from database
3. Run seed again

---

## **Testing the Setup**

### **Test as Ramoen (Admin):**
1. Login: ramoen@verifiedbizlink.co.za / TestPass123!
2. You should see: "👑 Admin Control Center"
3. Click any tool → Should navigate to that tool
4. Check stats: Should show "Pending Verifications: 12"

### **Test as Wesley (Banker):**
1. Login: wesley@verifiedbizlink.co.za / TestPass123!
2. You should see: "🏦 Banking Portal"
3. Click "Business Vetting Portal" → Should show vetting queue
4. Check stats: Should show "Pending Reviews: 8"

---

## **Files Created**

- `scripts/seed-admin-accounts.ts` - Seed script for creating accounts
- `src/app/api/setup/seed-accounts/route.ts` - API endpoint for seeding
- `SETUP_ADMIN_ACCOUNTS.md` - This guide

---

## **Troubleshooting**

**"Account already exists"**
- Accounts were already created
- Delete from Supabase and try again

**"Forbidden"**
- Setup secret is wrong
- Check that SETUP_SECRET env var is set

**"Supabase credentials missing"**
- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set
- Add them to .env.local

**Can't login after creating accounts**
- Check Supabase Auth to verify user exists
- Verify email is correct: ramoen@verifiedbizlink.co.za
- Try reset password

---

**Everything is set up and ready!** 🚀

# 🚀 Quick Start: Testing Everything

## **Step-by-Step Setup (15 minutes)**

### **Step 1: Create Test Users in Supabase**

Go to: https://app.supabase.com

Select project: `zfiidmgfgimkgpcyolg` → Click **Authentication** → **Users** → **+ Create user**

Create these 4 users:

| Email | Password | Role | Auto Confirm |
|-------|----------|------|--------------|
| test@example.com | TestPass123! | Customer | ✅ |
| ramoen@verifiedbizlink.co.za | TestPass123! | Admin | ✅ |
| wesley@verifiedbizlink.co.za | TestPass123! | Banker | ✅ |
| mraaziqp@gmail.com | TestPass123! | Super Admin | ✅ |

**After creating each user:**
- Click **Save user**
- Wait for green confirmation

---

### **Step 2: Start Development Server**

Open terminal in project folder:

```bash
npm run dev
```

Wait for:
```
▲ Next.js 15.5.9
✓ Ready in 2.3s
```

Then open: http://localhost:3000

---

### **Step 3: Clear Browser Cache**

Press: `Ctrl + Shift + Delete`
- [ ] Check "Cookies and cached files"
- [ ] Click "Clear data"

Hard refresh: `Ctrl + Shift + R`

---

### **Step 4: Test Login Flow**

1. Go to http://localhost:3000/login
2. Login with:
   ```
   test@example.com / TestPass123!
   ```
3. Should see dashboard
4. Try logout
5. Try login again to verify session works

**Expected:** ✅ Dashboard loads, no 401 errors

---

### **Step 5: Test Admin Panel**

1. Logout
2. Login as:
   ```
   ramoen@verifiedbizlink.co.za / TestPass123!
   ```
3. Go to `/admin/dashboard` or `/vetting-hub`
4. Should see admin-only tools
5. Click around, explore interface

**Expected:** ✅ Admin panel visible, different from customer dashboard

---

### **Step 6: Test Email Verification**

1. Go to /signup
2. Register with NEW email: `test1@example.com`
3. **Check console in browser** (F12) → Network tab
4. Look for Resend API call
5. **Check Resend dashboard:** https://resend.com (login with your account)
6. Verify email was sent

**Expected:** ✅ Email shows in Resend dashboard within 2 seconds

---

### **Step 7: Quick Feature Test**

- [ ] Create a post with an image
- [ ] Like a post
- [ ] Comment on a post
- [ ] Upload profile avatar
- [ ] Switch dashboard tabs
- [ ] View different pages

**Expected:** ✅ All features responsive, no errors in console

---

## **Troubleshooting**

| Issue | Fix |
|-------|-----|
| Manifest error | Already fixed in next.config.ts ✅ |
| Compliance 404 | Added /api/compliance endpoint ✅ |
| Login fails (401) | Create users in Supabase Console |
| Emails not arriving | Check Resend dashboard for errors |
| Images not uploading | Verify Supabase Storage credentials |
| Dashboard won't load | Check role is set correctly in Neon |

---

## **What to Test Next**

After basic testing works, run through: **COMPREHENSIVE_TEST_PLAN.md**

This has 48 test cases across all features.

---

## **Files Changed**

✅ `next.config.ts` - Added manifest headers  
✅ `src/app/api/compliance/route.ts` - Created endpoint  
✅ `COMPREHENSIVE_TEST_PLAN.md` - Full test guide  

---

## **Success = All Users Can Login + Dashboard Loads**

Once that works, you're good to run comprehensive tests!

# 📋 FINAL VERCEL ENVIRONMENT VARIABLES - COMPLETE PRODUCTION CONFIG

**All EXACT values for production deployment with Neon + Supabase**

---

## 🎯 **COPY ALL 10 VARIABLES BELOW TO VERCEL**

Go to: https://vercel.com/dashboard → VerifiedBizLink → Settings → Environment Variables

Add each variable exactly as shown:

---

## 🗄️ **DATABASE & STORAGE VARIABLES**

### **1. DATABASE_URL** (Neon PostgreSQL)
```
Name:  DATABASE_URL
Value: postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p.eu-west-2.aws.neon.tech/neondb?sslmode=require
Env:   ✅ Production ✅ Preview ✅ Development
```

### **2. NEXT_PUBLIC_SUPABASE_URL** (Supabase)
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://zfiidmgfgimkgpcyolg.supabase.co
Env:   ✅ Production ✅ Preview ✅ Development
```

### **3. NEXT_PUBLIC_SUPABASE_ANON_KEY** (Supabase Public)
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i
Env:   ✅ Production ✅ Preview ✅ Development
```

### **4. SUPABASE_SERVICE_ROLE_KEY** (Supabase Admin)
```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp
Env:   ✅ Production ✅ Preview ✅ Development
```

---

## 📧 **EMAIL SERVICE VARIABLES**

### **5. RESEND_API_KEY** (Email Service)
```
Name:  RESEND_API_KEY
Value: re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
Env:   ✅ Production ✅ Preview ✅ Development
```

### **6. RESEND_FROM_EMAIL** (Email Sender)
```
Name:  RESEND_FROM_EMAIL
Value: noreply@verifiedbizlink.co.za
Env:   ✅ Production ✅ Preview ✅ Development
```

---

## 🔐 **SECURITY & AUTH VARIABLES**

### **7. JWT_SECRET** (Authentication)
```
Name:  JWT_SECRET
Value: vbl-super-secret-jwt-key-2026-do-not-expose
Env:   ✅ Production ✅ Preview ✅ Development
```

### **8. SETUP_SECRET** (Setup Protection)
```
Name:  SETUP_SECRET
Value: dev-seed-secret-2024-vbl
Env:   ✅ Production ✅ Preview ✅ Development
```

---

## 🌐 **APP CONFIGURATION VARIABLES**

### **9. NEXT_PUBLIC_APP_URL** (App URL)
```
Name:  NEXT_PUBLIC_APP_URL
Value: https://www.verifiedbizlink.co.za
Env:   ✅ Production ✅ Preview ✅ Development
```

### **10. GOOGLE_API_KEY** (AI Service)
```
Name:  GOOGLE_API_KEY
Value: AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E
Env:   ✅ Production ✅ Preview ✅ Development
```

---

## 📊 **QUICK REFERENCE TABLE**

| # | Name | Value | Type |
|---|------|-------|------|
| 1 | `DATABASE_URL` | `postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p.eu-west-2.aws.neon.tech/neondb?sslmode=require` | Database |
| 2 | `NEXT_PUBLIC_SUPABASE_URL` | `https://zfiidmgfgimkgpcyolg.supabase.co` | Storage |
| 3 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i` | Storage |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp` | Storage |
| 5 | `RESEND_API_KEY` | `re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah` | Email |
| 6 | `RESEND_FROM_EMAIL` | `noreply@verifiedbizlink.co.za` | Email |
| 7 | `JWT_SECRET` | `vbl-super-secret-jwt-key-2026-do-not-expose` | Auth |
| 8 | `SETUP_SECRET` | `dev-seed-secret-2024-vbl` | Security |
| 9 | `NEXT_PUBLIC_APP_URL` | `https://www.verifiedbizlink.co.za` | Config |
| 10 | `GOOGLE_API_KEY` | `AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E` | AI |

---

## 🚀 **STEP-BY-STEP VERCEL SETUP**

### **Step 1: Open Vercel Settings**
1. Go to https://vercel.com/dashboard
2. Click **VerifiedBizLink** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### **Step 2: Add Variables**
For each variable above:
1. Click **+ Add New**
2. Enter **Name** (exactly as shown)
3. Enter **Value** (exactly as shown)
4. Check all three environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **Save**

### **Step 3: Verify All Added**
Should see 10 environment variables in the list

### **Step 4: Redeploy**
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **⋮** (three dots menu)
4. Click **Redeploy**
5. Wait 2-3 minutes for deployment

### **Step 5: Test**
1. Go to https://www.verifiedbizlink.co.za
2. Should load without errors
3. Database tables auto-created
4. Try signing up
5. Try creating a post

---

## ✅ **WHAT EACH VARIABLE DOES**

```
DATABASE_URL
  ✓ Connects to Neon PostgreSQL
  ✓ Stores users, posts, comments, analytics
  ✓ All app data persistence

NEXT_PUBLIC_SUPABASE_URL
  ✓ Supabase project URL
  ✓ Used for image/video storage
  ✓ Used for authentication

NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ Public Supabase key
  ✓ Limited permissions for security
  ✓ Used by browser

SUPABASE_SERVICE_ROLE_KEY
  ✓ Admin Supabase key
  ✓ Full permissions for server
  ✓ Used by backend only
  ⚠️ KEEP PRIVATE

RESEND_API_KEY
  ✓ Email service key
  ✓ Sends verification emails
  ✓ Sends notifications
  ⚠️ KEEP PRIVATE

RESEND_FROM_EMAIL
  ✓ Email sender address
  ✓ Appears in email "From:" field
  ✓ Must match verified domain

JWT_SECRET
  ✓ Authenticates users
  ✓ Creates session tokens
  ✓ Must be strong & random
  ⚠️ KEEP PRIVATE

SETUP_SECRET
  ✓ Protects setup endpoints
  ✓ Prevents unauthorized access
  ⚠️ KEEP PRIVATE

NEXT_PUBLIC_APP_URL
  ✓ Production app URL
  ✓ Used in emails
  ✓ Used in redirects

GOOGLE_API_KEY
  ✓ Gemini AI integration
  ✓ Optional but recommended
  ⚠️ KEEP PRIVATE
```

---

## 🔐 **SECURITY NOTES**

⚠️ **Keep These SECRET:**
- `DATABASE_URL` - Direct database access
- `SUPABASE_SERVICE_ROLE_KEY` - Admin Supabase
- `RESEND_API_KEY` - Email sending
- `JWT_SECRET` - Authentication
- `SETUP_SECRET` - Setup protection
- `GOOGLE_API_KEY` - AI service

✅ **Safe to Share:**
- `NEXT_PUBLIC_SUPABASE_URL` - Public URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key
- `NEXT_PUBLIC_APP_URL` - App URL
- `RESEND_FROM_EMAIL` - Email address

---

## 📝 **LOCAL DEVELOPMENT (.env.local)**

Your local `.env.local` already has these values:

```
DATABASE_URL="postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p.eu-west-2.aws.neon.tech/neondb?sslmode=require"

NEXT_PUBLIC_SUPABASE_URL="https://zfiidmgfgimkgpcyolg.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp"

RESEND_API_KEY="re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah"
RESEND_FROM_EMAIL="noreply@verifiedbizlink.co.za"

JWT_SECRET="vbl-super-secret-jwt-key-2026-do-not-expose"
SETUP_SECRET="dev-seed-secret-2024-vbl"

NEXT_PUBLIC_APP_URL="http://localhost:9002"
GOOGLE_API_KEY="AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E"
```

---

## 🎯 **INFRASTRUCTURE OVERVIEW**

```
Frontend (Vercel)
    ↓
Next.js App
    ↓
┌─────────────────────────────────────┐
│       Your Infrastructure            │
├─────────────────────────────────────┤
│ Database:     Neon PostgreSQL       │
│ Storage:      Supabase              │
│ Auth:         Supabase Auth         │
│ Email:        Resend                │
│ AI:           Google Gemini         │
└─────────────────────────────────────┘
```

---

## ✨ **AFTER DEPLOYING**

Your app will have:

✅ User authentication (Supabase)  
✅ User data storage (Neon)  
✅ Posts & comments (Neon)  
✅ Image uploads (Supabase)  
✅ Email notifications (Resend)  
✅ Admin tools (role-based)  
✅ Analytics (Neon)  
✅ Search history (Neon)  
✅ Following/Favorites (Neon)  
✅ Production-ready (auto-scaling)  

---

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] Add 10 env vars to Vercel
- [ ] All selected for all environments
- [ ] Redeploy app
- [ ] Wait 2-3 minutes
- [ ] Go to https://www.verifiedbizlink.co.za
- [ ] Test sign up
- [ ] Test login
- [ ] Test post creation
- [ ] Test image upload
- [ ] Check admin dashboard

---

## ⏱️ **TIME TO DEPLOY**

Adding variables: **~5 minutes**  
Redeploying: **~3 minutes**  
Testing: **~5 minutes**  
**Total: ~13 minutes** ⚡

---

**Ready to deploy? Add these 10 variables and redeploy!** 🚀

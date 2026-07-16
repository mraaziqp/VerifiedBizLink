# 🔐 VERCEL ENVIRONMENT VARIABLES - Complete List

**Last Updated:** 2026-06-10  
**Status:** All variables documented  
**Purpose:** Deploy production with all services working  

---

## 🎯 **QUICK SETUP (Copy-Paste Reference)**

Go to: `https://vercel.com/dashboard/VerifiedBizLink/settings/environment-variables`

---

## 📋 **ALL REQUIRED VARIABLES**

### **1. RESEND EMAIL SERVICE**

**Variable:** `RESEND_API_KEY`  
**Type:** Secret  
**Value:** `re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah`  
**Environment:** Production + Preview + Development  
**Purpose:** Send emails (signup, password reset, notifications)  

---

### **2. SUPABASE - PUBLIC (Safe to expose)**

**Variable:** `NEXT_PUBLIC_SUPABASE_URL`  
**Type:** Public  
**Value:** `https://hllycop.supabase.co`  
**Environment:** Production + Preview + Development  
**Purpose:** Supabase project URL  

---

**Variable:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Type:** Public  
**Value:** `sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z`  
**Environment:** Production + Preview + Development  
**Purpose:** Client-side Supabase access (uploads)  

---

### **3. SUPABASE - SECRET (Server-only)**

**Variable:** `SUPABASE_SERVICE_ROLE_KEY`  
**Type:** Secret  
**Value:** `[Get from Supabase → Settings → API]`  
**Environment:** Production + Preview + Development  
**Purpose:** Server-side Supabase access (admin operations)  

**How to Get:**
1. Go to: https://supabase.com/dashboard
2. Select: VerifiedBizLink project
3. Click: Settings
4. Click: API
5. Copy: The `service_role` key (the long secret)
6. Paste in Vercel

---

### **4. DATABASE (Already set locally)**

**Variable:** `DATABASE_URL`  
**Type:** Secret  
**Value:** `postgresql://neondb_owner:npg_JKPrhN0bY9UQ@ep-long-bonus-abxhs75s-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`  
**Environment:** Production + Preview + Development  
**Purpose:** Neon PostgreSQL database connection  
**Note:** May already be set in Vercel  

---

### **5. JWT SECRET (Already set locally)**

**Variable:** `JWT_SECRET`  
**Type:** Secret  
**Value:** `<REDACTED-generate-a-new-random-secret-do-not-commit>`  
**Environment:** Production + Preview + Development  
**Purpose:** JWT token signing  
**Note:** May already be set in Vercel  

---

### **6. GOOGLE AI API (Already set locally)**

**Variable:** `GOOGLE_API_KEY`  
**Type:** Secret  
**Value:** `<REDACTED-rotate-in-Google-Cloud-console>`  
**Environment:** Production + Preview + Development  
**Purpose:** Google Gemini AI for chat features  
**Note:** May already be set in Vercel  

---

### **7. APP URL (Already set locally)**

**Variable:** `NEXT_PUBLIC_APP_URL`  
**Type:** Public  
**Value:** `https://www.verifiedbizlink.co.za`  
**Environment:** Production only (update for prod)  
**Value for Development:** `http://localhost:9002`  
**Purpose:** Base URL for the application  

---

## ✅ **VERCEL SETUP STEPS**

### **Step 1: Navigate to Environment Variables**

1. Go to: `https://vercel.com/dashboard`
2. Click: VerifiedBizLink project
3. Click: Settings
4. Click: Environment Variables (left sidebar)

---

### **Step 2: Check Existing Variables**

These may already be set:
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] GOOGLE_API_KEY
- [ ] NEXT_PUBLIC_APP_URL

If not set, add them.

---

### **Step 3: Update Resend Key**

Find: `RESEND_API_KEY`
- Click: Edit (pencil icon)
- Update to: `re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah`
- Click: Save

---

### **Step 4: Add Supabase Variables**

Click: **+ Add New**

**Add #1: Supabase URL**
```
Variable: NEXT_PUBLIC_SUPABASE_URL
Value: https://hllycop.supabase.co
Environments: Production, Preview, Development
Click: Save
```

**Add #2: Supabase Anon Key**
```
Variable: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
Environments: Production, Preview, Development
Click: Save
```

**Add #3: Supabase Service Role Key**
```
Variable: SUPABASE_SERVICE_ROLE_KEY
Value: [Paste the service_role key from Supabase]
Environments: Production, Preview, Development
Click: Save
```

---

### **Step 5: Redeploy**

1. Go to: Deployments
2. Click: Latest deployment
3. Click: ⚙️ (three dots)
4. Click: Redeploy
5. Wait: ~2-3 minutes

---

## 📊 **ENVIRONMENT VARIABLES SUMMARY TABLE**

| Variable | Type | Purpose | Status |
|----------|------|---------|--------|
| RESEND_API_KEY | Secret | Email service | Update |
| NEXT_PUBLIC_SUPABASE_URL | Public | Supabase project | Add |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public | Client uploads | Add |
| SUPABASE_SERVICE_ROLE_KEY | Secret | Server operations | Add |
| DATABASE_URL | Secret | PostgreSQL | Check/Add |
| JWT_SECRET | Secret | Token signing | Check/Add |
| GOOGLE_API_KEY | Secret | AI features | Check/Add |
| NEXT_PUBLIC_APP_URL | Public | Base URL | Check/Update |

---

## ✅ **COMPLETE CHECKLIST**

### **Before Deployment**

- [ ] Supabase project created
- [ ] 4 storage buckets created
- [ ] Service Role Key copied
- [ ] Resend API key ready
- [ ] All keys verified

### **Vercel Configuration**

- [ ] Login to Vercel
- [ ] Go to VerifiedBizLink settings
- [ ] Update RESEND_API_KEY
- [ ] Add NEXT_PUBLIC_SUPABASE_URL
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Add SUPABASE_SERVICE_ROLE_KEY
- [ ] Verify DATABASE_URL exists
- [ ] Verify JWT_SECRET exists
- [ ] Verify GOOGLE_API_KEY exists
- [ ] Verify NEXT_PUBLIC_APP_URL (update if needed)
- [ ] Save all variables
- [ ] Redeploy application

### **After Deployment**

- [ ] Wait for build to complete
- [ ] Test homepage loads
- [ ] Test login works
- [ ] Test email (signup)
- [ ] Test profile picture upload
- [ ] Test post media upload
- [ ] Test all features

---

## 🔍 **HOW TO GET SUPABASE SERVICE ROLE KEY**

1. Open: https://supabase.com/dashboard
2. Click: VerifiedBizLink project
3. Left sidebar: Click **Settings**
4. Click: **API**
5. Under "API Keys" section:
   - Find: `service_role`
   - Copy: The long secret key
   - It looks like: `eyJhbGc...` (very long string)
6. Paste this in Vercel as `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ **SECURITY NOTES**

**Never commit to GitHub:**
- SUPABASE_SERVICE_ROLE_KEY ❌
- RESEND_API_KEY ❌
- DATABASE_URL ❌
- JWT_SECRET ❌
- GOOGLE_API_KEY ❌

**Safe to commit (with NEXT_PUBLIC_ prefix):**
- NEXT_PUBLIC_SUPABASE_URL ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
- NEXT_PUBLIC_APP_URL ✅

---

## 🚀 **QUICK REFERENCE**

### **Copy These Values to Vercel:**

```
RESEND_API_KEY=re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
NEXT_PUBLIC_SUPABASE_URL=https://hllycop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
```

---

## ✨ **AFTER ALL VARIABLES ARE SET**

Features will work:
- ✅ Email sending (signup, password reset)
- ✅ Profile picture uploads
- ✅ Post image uploads
- ✅ Post video uploads
- ✅ Document uploads (vetting)
- ✅ All media storage in Supabase

---

**Once these are set, everything will be fully functional!** 🎉

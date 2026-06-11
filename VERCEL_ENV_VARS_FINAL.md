# 📋 VERCEL ENVIRONMENT VARIABLES - EXACT CONFIGURATION

**Your new Supabase credentials extracted and ready for Vercel**

---

## 🔐 **YOUR NEW SUPABASE CREDENTIALS**

From your new Supabase account, here are your keys:

```
Publishable Key:  sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i
Secret Key:       sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp
```

---

## 🌐 **SUPABASE PROJECT URL** (NEEDED)

You'll need to provide:
```
https://[YOUR-PROJECT-REF].supabase.co
```

**Where to find it:**
1. Go to: https://app.supabase.com
2. Select your project
3. Click **Settings** (bottom left) → **General**
4. Look for **Project URL** - copy the entire URL

**Example:**
```
https://hllycop.supabase.co
```

---

## ✅ **COMPLETE VERCEL ENV VARS TO SET**

**Copy and paste these EXACT names and values into Vercel:**

### **1. Supabase Configuration**

```
NEXT_PUBLIC_SUPABASE_URL = https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i
SUPABASE_SERVICE_ROLE_KEY = sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp
```

### **2. Email Service (Resend)**

```
RESEND_API_KEY = re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
RESEND_FROM_EMAIL = noreply@verifiedbizlink.co.za
```

### **3. JWT & Security**

```
JWT_SECRET = vbl-super-secret-jwt-key-2026-do-not-expose
SETUP_SECRET = dev-seed-secret-2024-vbl
```

### **4. App Configuration**

```
NEXT_PUBLIC_APP_URL = https://www.verifiedbizlink.co.za
```

### **5. AI (Google Gemini)**

```
GOOGLE_API_KEY = AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E
```

---

## 📋 **HOW TO ADD TO VERCEL (Step-by-Step)**

### **Step 1: Go to Vercel Project**
1. Go to: https://vercel.com/dashboard
2. Click on **VerifiedBizLink** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### **Step 2: Add Each Variable**

For each environment variable:

1. Click **+ Add New**
2. Enter **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter **Value** (e.g., your Supabase URL)
4. Select environment: **Production, Preview, Development**
5. Click **Save**

**Repeat for all variables above**

### **Step 3: Redeploy**

After adding all variables:
1. Click **Deployments** (top menu)
2. Find the latest deployment
3. Click **⋯** (three dots)
4. Click **Redeploy**

---

## 📊 **VARIABLE SUMMARY TABLE**

| Name | Value | Environment | Secret |
|------|-------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | All | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i` | All | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp` | All | Yes |
| `RESEND_API_KEY` | `re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah` | All | Yes |
| `RESEND_FROM_EMAIL` | `noreply@verifiedbizlink.co.za` | All | No |
| `JWT_SECRET` | `vbl-super-secret-jwt-key-2026-do-not-expose` | All | Yes |
| `SETUP_SECRET` | `dev-seed-secret-2024-vbl` | All | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://www.verifiedbizlink.co.za` | All | No |
| `GOOGLE_API_KEY` | `AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E` | All | Yes |

---

## 🔒 **SECURITY NOTES**

⚠️ **Keep these secret:**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access to database
- `RESEND_API_KEY` - Email sending service
- `JWT_SECRET` - Authentication secret
- `GOOGLE_API_KEY` - AI service access

✅ **Safe to share:**
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key (limited permissions)
- `NEXT_PUBLIC_APP_URL` - Your app URL
- `RESEND_FROM_EMAIL` - Email address

---

## 🚀 **AFTER SETTING VERCEL ENV VARS**

Once all variables are added and you redeploy:

1. ✅ Database will connect to new Supabase
2. ✅ Emails will send via Resend
3. ✅ Authentication will work
4. ✅ Admin accounts can be created
5. ✅ App will be production-ready

---

## 📝 **LOCAL DEVELOPMENT (.env.local)**

For local development, your `.env.local` should match these values:

```
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
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

**⚠️ IMPORTANT: Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference!**

Provide your Supabase URL and I'll finalize everything and set up the database migrations.

---

**Total Variables to Add: 9**  
**Estimated Setup Time: 10 minutes**  
**Status: Ready to deploy** 🚀

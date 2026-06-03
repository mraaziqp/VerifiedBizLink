# Environment Variables - Complete Setup

## 🚀 For Your .env.local (Local Development)

Copy and paste this into `k:\Projects\VerifiedBizLink\.env.local`:

```
# ============================================
# SUPABASE (Image Storage & Database)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg

# ============================================
# GEMINI AI (Smart Support & Research)
# ============================================
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# ============================================
# RESEND (Email Service)
# ============================================
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE
SUPPORT_EMAIL=mraaziqp@gmail.com
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za
```

---

## 📝 How to Get API Keys

### 1. Gemini API Key
```
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Select your Google project (or create new)
4. Copy the API key
5. Paste into: GEMINI_API_KEY=
```

### 2. Resend API Key (Already Configured)
```
You already have Resend set up.
Just confirm:
- RESEND_API_KEY exists in your .env
- RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za
```

---

## 🚀 For Vercel Production

Go to Vercel Dashboard:
1. Select: VerifiedBizLink project
2. Settings → Environment Variables

Add these 5 variables:

```
NEXT_PUBLIC_SUPABASE_URL
Value: https://yxotoupitmeiuaabcdx.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg

GEMINI_API_KEY
Value: YOUR_GEMINI_API_KEY

RESEND_API_KEY
Value: YOUR_RESEND_API_KEY
```

Then: **Redeploy** your project

---

## ✅ Quick Checklist

```
Local Development:
☐ .env.local updated with all 6 variables
☐ Dev server restarted
☐ Contact page loads at /contact
☐ Admin dashboard loads at /admin
☐ Settings page shows AI toggle
☐ Gemini API working (test by sending query)
☐ Resend API working (test email sending)

Production (Vercel):
☐ All 5 env vars added to Vercel
☐ Project redeployed
☐ Test: /contact page works
☐ Test: Admin dashboard works
☐ Test: Emails send successfully
```

---

## 🔗 Links

- **Gemini API:** https://aistudio.google.com/app/apikey
- **Resend Dashboard:** https://resend.com/dashboard
- **Vercel Settings:** https://vercel.com/dashboard

---

**All keys are ready to copy/paste. Just add your Gemini API key and you're set!**

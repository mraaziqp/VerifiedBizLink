# SUPABASE - COMPLETE SETUP (Copy/Paste Ready)

## Your Supabase Project Info

**Project ID:** `yxotoupitmeiuaabcdx`  
**Project Region:** Check dashboard

---

## 🔑 ENVIRONMENT VARIABLES - COPY THESE EXACTLY

### For Local Development (.env.local)

Copy and paste this entire block into `k:\Projects\VerifiedBizLink\.env.local`:

```
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg
```

**That's all you need for local testing!**

---

### For Vercel Production (Use Vercel Dashboard)

Go to: `https://vercel.com/dashboard`  
Select your project: `VerifiedBizLink`  
Go to: `Settings → Environment Variables`

Add these exact variables:

**Variable 1:**
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://yxotoupitmeiuaabcdx.supabase.co
```

**Variable 2:**
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
```

**Variable 3:**
```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg
```

After adding all 3, click **Redeploy** to apply changes.

---

## 🔐 KEY BREAKDOWN

### NEXT_PUBLIC_SUPABASE_URL
- **Purpose:** Connects to your Supabase project
- **Type:** Public (safe to expose in browser)
- **Used for:** API calls, storage, database
- **Value:** `https://yxotoupitmeiuaabcdx.supabase.co`

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Purpose:** Anonymous access for users
- **Type:** Public (safe to expose)
- **Used for:** User authentication, file uploads
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM`

### SUPABASE_SERVICE_ROLE_KEY
- **Purpose:** Server-side admin access
- **Type:** SECRET (never expose in browser)
- **Used for:** Server operations, batch operations
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg`

---

## ✅ HOW TO SET UP (Step by Step)

### STEP 1: Add to Local .env.local

```bash
# Open file: k:\Projects\VerifiedBizLink\.env.local
# Paste the environment variables block above
# Save file (Ctrl+S)
# Restart dev server (stop and npm run dev)
```

### STEP 2: Verify It Works Locally

```bash
# Run dev server
npm run dev

# Visit: http://localhost:9002
# Check console (F12) for any SUPABASE errors
# Should see: No errors
```

### STEP 3: Create Supabase Storage Buckets

Go to: `https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx/storage`

**Create Bucket 1: avatars**
- Name: `avatars`
- Type: Public (avatars need to be viewable)
- Click Create

**Create Bucket 2: documents**
- Name: `documents`
- Type: Private (documents are sensitive)
- Click Create

### STEP 4: Upload Test Image

In Supabase Dashboard → Storage:
1. Click "avatars" bucket
2. Click "Upload file"
3. Upload a test image (any .jpg or .png)
4. Copy the URL
5. Test it loads in browser

### STEP 5: Deploy to Vercel (Later)

When ready to go live:
1. Go to Vercel dashboard
2. Add the 3 environment variables
3. Redeploy
4. Test on production URL

---

## 🖼️ IMAGE UPLOAD TEST (For Demo)

### What You'll Test

Users can upload profile pictures (avatars) and documents.

### How to Test in Demo

**Option 1: During Demo (if you have time)**

```
1. Go to Settings → Profile tab
2. Click "Upload Photo"
3. Select image from your computer
4. Watch it upload and display
5. Show: "Real-time file storage working!"
```

**Option 2: Before Demo (safe)**

```
1. Login with test account
2. Go to Settings
3. Click "Upload Photo"
4. Try uploading an image
5. Verify: Image shows in profile
6. Take screenshot for reference
```

---

## 🔍 HOW TO VERIFY SETUP

### In Browser Console (F12)

```javascript
// Check 1: Supabase is loaded
console.log(window.location)
// Should show: localhost:9002

// Check 2: Environment variables exist
console.log(process.env)
// Should show NEXT_PUBLIC_SUPABASE_URL
```

### In Network Tab (F12)

```
1. Open DevTools (F12)
2. Click Network tab
3. Perform an action (like uploading image)
4. Look for requests to:
   - yxotoupitmeiuaabcdx.supabase.co
5. Should see 200 status (success)
```

### In Supabase Dashboard

```
1. Go to: https://supabase.com/dashboard
2. Click project: yxotoupitmeiuaabcdx
3. Check: Storage section shows your buckets
4. Check: Upload history shows your test files
```

---

## ⚠️ COMMON ISSUES

### Issue: "Supabase is undefined"
**Fix:** Restart dev server after adding .env.local variables

### Issue: "403 Forbidden" on upload
**Fix:** Check bucket permissions - should be Public for avatars

### Issue: "CORS error"
**Fix:** Normal - Supabase handles CORS. Check network tab for actual request.

### Issue: Image won't display
**Fix:** Check URL is correct in Supabase. Try accessing directly in browser.

---

## 🚀 AFTER DEMO - PRODUCTION SETUP

1. **Vercel:** Add environment variables (see above)
2. **Redeploy:** Click redeploy in Vercel
3. **Test:** Visit production URL and test uploads
4. **Monitor:** Check Supabase dashboard for storage usage
5. **Optimize:** Enable CDN caching for images

---

## 📞 SUPABASE PROJECT LINKS

- **Dashboard:** https://supabase.com/dashboard
- **Your Project:** https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx
- **Storage:** https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx/storage
- **Database:** https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx/sql

---

## ✅ QUICK CHECKLIST

Before demo:
```
☐ Environment variables in .env.local
☐ Dev server restarted
☐ Can login successfully
☐ No Supabase errors in console
☐ Supabase buckets created (avatars, documents)
☐ Ready to demo image upload
```

**All checked? You're ready to test live uploads!** 🎉

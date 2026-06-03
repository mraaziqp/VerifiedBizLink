# 🚀 Production Environment Variables Checklist

**For:** verifiedbizlink.co.za (or your Vercel/production domain)

---

## ✅ Required Environment Variables

### 1. **Supabase (Database & Storage)**
```
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg
```
Status: ✅ Same keys work for both local and production

---

### 2. **Gemini API (AI Responses)**
```
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
```
**How to get:**
1. Go: https://aistudio.google.com/app/apikey
2. Click: "Create API key"
3. Copy the key
4. Paste into Vercel env vars

Status: ⚠️ **NEEDED FOR:** Contact form AI responses

---

### 3. **Resend (Email Service)**
```
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za
SUPPORT_EMAIL=mraaziqp@gmail.com
```
Status: ⚠️ **NEEDED FOR:** Sending email notifications

---

## 📋 How to Add to Vercel

### Step 1: Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

### Step 2: Select Your Project
```
Click: VerifiedBizLink project
```

### Step 3: Go to Settings
```
Click: Settings (top menu)
→ Environment Variables
```

### Step 4: Add Variables
For each variable above:
1. Click: "Add New"
2. Name: `VARIABLE_NAME`
3. Value: `paste_the_value`
4. Environment: Production (or All)
5. Click: Save

### Step 5: Redeploy
```
1. Go: Deployments tab
2. Click latest deployment
3. Click: "Redeploy" 
4. Wait for build to complete
5. Test on live domain
```

---

## ✅ Verification Checklist

After adding all variables and redeploying:

```
☐ Home page loads: https://verifiedbizlink.co.za
☐ Can see businesses: https://verifiedbizlink.co.za
☐ Can sign up: https://verifiedbizlink.co.za/signup
☐ Can log in: https://verifiedbizlink.co.za/login
☐ Admin dashboard loads: https://verifiedbizlink.co.za/admin
☐ Contact form works: https://verifiedbizlink.co.za/contact
☐ Settings page loads: https://verifiedbizlink.co.za/settings
☐ No red console errors (F12)
☐ Images load properly
☐ Dark mode works
☐ Mobile responsive
```

---

## 🔍 Troubleshooting

### Login Still Not Working?
1. Check Supabase keys are correct
2. Go to Supabase dashboard
3. Verify "users" table exists
4. Verify a user exists in the table
5. Try signup instead of login

### Contact Form Not Sending Emails?
1. Verify GEMINI_API_KEY is set
2. Verify RESEND_API_KEY is set
3. Check email tab in browser dev tools (F12)
4. Look for error responses from `/api/contact`

### Images Not Loading?
1. Check NEXT_PUBLIC_SUPABASE_URL is correct
2. Check NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
3. Go to Supabase Storage bucket "avatars"
4. Verify images exist in storage

### Everything Blurred?
1. Hard refresh: Ctrl+Shift+R
2. Clear cache: Ctrl+Shift+Delete
3. Check if CSS loaded (F12 → Network → filter CSS)

---

## 📞 Support

If you still have issues:
1. Open browser dev tools (F12)
2. Go to Console tab
3. Take screenshot of any red errors
4. Share the error message

---

**Status: Ready to Configure**
Add these variables to Vercel and redeploy to go live! 🚀

# 🔑 Update API Keys Guide

**Date:** 2026-06-10  
**Status:** ✅ Critical fixes applied  

---

## 📋 New API Keys

### **Resend Email API**
```
NEW KEY: re_4jzBUFKT_AASjUkN5bJBZFZFbMJDns8Tz
```

### **Supabase Storage**
```
URL: https://hllycop.supabase.co
ANON KEY: sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
```

---

## 🚀 How to Update on Vercel

### **Step 1: Go to Vercel Dashboard**
```
https://vercel.com/dashboard
```

### **Step 2: Select VerifiedBizLink Project**
```
1. Go to Projects
2. Click "VerifiedBizLink"
3. Go to Settings
4. Select "Environment Variables"
```

### **Step 3: Update Resend API Key**
```
1. Find: RESEND_API_KEY
2. Delete old value
3. Enter: re_4jzBUFKT_AASjUkN5bJBZFZFbMJDns8Tz
4. Click "Save"
```

### **Step 4: Add Supabase Keys**
```
1. Click "Add New"
2. Name: NEXT_PUBLIC_SUPABASE_URL
3. Value: https://hllycop.supabase.co
4. Click "Save"

5. Click "Add New"
6. Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
7. Value: sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
8. Click "Save"
```

### **Step 5: Redeploy**
```
1. Go to "Deployments"
2. Click the latest deployment
3. Click "Redeploy"
4. Wait for build to complete
```

---

## ✅ What's Fixed Locally

```
✅ Admin dashboard tools show immediately
✅ Ramoen sees all 5 tools without delay
✅ Wesley sees vetting portal instantly
✅ Back to App keeps you logged in
✅ Role detection works perfectly
```

---

## 📧 Email Configuration

### **After Updating Resend Key on Vercel:**

1. **Verify Resend Domain**
   ```
   Go to: https://resend.com/domains
   Add domain: verifiedbizlink.co.za
   Add DNS records from Resend to your domain provider
   Verify domain in Resend dashboard
   ```

2. **Test Email**
   ```
   After domain verified, try:
   - Signup (should send welcome email)
   - Password reset (should send reset email)
   - Any email feature should work
   ```

---

## 🖼️ Image & Video Storage (Supabase)

### **Setup Instructions Coming Soon**

```
Keys are in place, but Supabase buckets need to be configured:
1. Create "images" bucket in Supabase
2. Create "videos" bucket in Supabase
3. Set public access for buckets
4. Update upload endpoints in app
```

---

## 🔒 Environment Variables Summary

| Variable | Type | Status | Notes |
|----------|------|--------|-------|
| **RESEND_API_KEY** | Secret | ✅ Updated | New account key |
| **NEXT_PUBLIC_SUPABASE_URL** | Public | ✅ Added | Storage URL |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Public | ✅ Added | Storage key |
| **RESEND_FROM_EMAIL** | Public | ✅ Active | noreply@verifiedbizlink.co.za |

---

## ✨ Quick Checklist

- [ ] Go to Vercel dashboard
- [ ] Update RESEND_API_KEY
- [ ] Add NEXT_PUBLIC_SUPABASE_URL
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Redeploy application
- [ ] Verify domain in Resend (if not done)
- [ ] Test email sending
- [ ] Confirm admin tools show for all roles

---

**After these steps, everything will be connected!** 🚀

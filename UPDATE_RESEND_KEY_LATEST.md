# 📧 Updated Resend API Key - Action Required

**Date:** 2026-06-10  
**Status:** ✅ Updated locally, needs Vercel update  

---

## 🔑 New Resend API Key

```
re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
```

---

## ✅ What's Done

- ✅ Updated locally in `.env.local`
- ✅ Ready for testing
- ✅ Needs Vercel environment variable update

---

## 🚀 Update on Vercel (REQUIRED)

### **Step 1: Go to Vercel Dashboard**
```
https://vercel.com/dashboard
```

### **Step 2: Select VerifiedBizLink Project**
```
Projects → VerifiedBizLink → Settings
```

### **Step 3: Go to Environment Variables**
```
Settings → Environment Variables
```

### **Step 4: Update RESEND_API_KEY**
```
1. Find: RESEND_API_KEY
2. Click: Edit (pencil icon)
3. Clear: Old value
4. Enter: re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
5. Click: Save
```

### **Step 5: Redeploy**
```
1. Go to: Deployments
2. Click: Latest deployment
3. Click: Redeploy
4. Wait: ~2-3 minutes for build
```

---

## 🧪 Test Email Functionality

After Vercel redeploys:

```
1. Go to: https://www.verifiedbizlink.co.za
2. Click: Signup
3. Enter: Test email and password
4. Submit: Form
5. Check: Email inbox for verification link
6. Verify: Email received successfully
```

---

## ✨ Local Testing (Optional)

To test locally before Vercel:

```bash
# Start dev server
npm run dev

# Go to http://localhost:9002
# Try signup flow
# Check console for email logs
```

---

## 📋 Checklist

- [ ] Update Resend key on Vercel
- [ ] Redeploy application
- [ ] Wait for build to complete
- [ ] Test signup email
- [ ] Test password reset email
- [ ] Confirm emails arrive

---

## 🔐 Security Note

- This key is only for development/testing
- Don't commit to GitHub (it's in .gitignore)
- Rotate keys periodically
- Never share in public channels

---

## 📞 If Emails Still Don't Work

1. **Verify domain in Resend:**
   ```
   Go to: https://resend.com/domains
   Add: verifiedbizlink.co.za (if not already done)
   Add DNS records to your domain provider
   Verify in Resend dashboard
   ```

2. **Check Resend account:**
   ```
   Go to: https://resend.com
   Login with your account
   Check API key is valid
   Check domain status
   ```

3. **Check Vercel logs:**
   ```
   Vercel → Deployments → Latest → Logs
   Look for email errors
   ```

---

**Action:** Update Vercel and redeploy! 🚀

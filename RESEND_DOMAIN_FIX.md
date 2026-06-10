# 🔧 Fix Resend Domain Verification

**Problem:** Domain not verified in Resend account  
**Impact:** Emails won't send  
**Solution:** Verify domain in Resend dashboard  
**Time:** 5-10 minutes  

---

## ❌ Current Error

```
403 Forbidden
The verifiedbizlink.co.za domain is not verified. 
Please add and verify your domain on https://resend.com/domains
```

---

## ✅ Fix Steps

### **Step 1: Go to Resend Dashboard**
```
https://resend.com/domains
```

### **Step 2: Add Domain**
```
1. Click "Add Domain" button
2. Enter: verifiedbizlink.co.za
3. Click "Add"
```

### **Step 3: Get DNS Records**
```
Resend will show you DNS records to add:
- DKIM record
- DMARC record
- SPF record

Copy these values
```

### **Step 4: Add DNS Records to Your Provider**
```
Go to your domain provider (wherever you host verifiedbizlink.co.za)
Examples: Namecheap, GoDaddy, Route53, CloudFlare, etc.

Add the DNS records provided by Resend:
1. DKIM record
2. DMARC record  
3. SPF record

Save changes
```

### **Step 5: Verify Domain**
```
1. Go back to Resend
2. Click "Verify" on the domain
3. Resend checks DNS records
4. Shows "Verified" when done ✓
```

### **Step 6: Test Email**
```
Emails will now send!
Test by signing up or resetting password
```

---

## ⏱️ Timing

DNS verification can take:
- Instant (sometimes)
- 5-15 minutes (usually)
- Up to 48 hours (rarely)

Most commonly: 5-10 minutes

---

## 📞 If Stuck

```
1. Make sure DNS records are added correctly
2. Wait 10 minutes and try again
3. Use Resend's DNS check tool
4. If still failing, check domain is correct
```

---

## 🎯 After Verification

Once domain is verified:
```
✅ Emails will send immediately
✅ All features work:
   - Signup emails
   - Password reset
   - Verification emails
   - All notifications
```

---

**Do this now and emails will work!** 🚀

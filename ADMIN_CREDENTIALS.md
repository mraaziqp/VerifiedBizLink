# VerifiedBizLink - Admin Credentials & Access Guide

## 🔐 Admin Account Credentials

### 1. **Ramoen - Lead Admin** (Vetting Specialist)
- **Email:** `ramoen@verifiedbizlink.co.za`
- **Role:** `admin`
- **Password:** `Admin@123` (temporary - Neon DB) / `Ramoen@123456` (for Supabase Auth)
- **Access:** All vetting and verification tools
- **Tools Available:**
  - ✅ Vetting Desk (review pending businesses)
  - ✅ Document Review (grade CIPC, VAT, ID documents)
  - ✅ User Management
  - ✅ Platform Analytics
  - ✅ Compliance Reporting
  - ✅ Audit Logs

### 2. **Wesley - Banking Specialist** (Compliance Officer)
- **Email:** `wesley@verifiedbizlink.co.za`
- **Role:** `banker`
- **Password:** `Admin@123` (temporary - Neon DB) / `Wesley@123456` (for Supabase Auth)
- **Access:** Banking and compliance tools
- **Tools Available:**
  - ✅ Business Vetting Portal
  - ✅ Legal Compliance Checks
  - ✅ Team Management

### 3. **Super Admin - Owner** (Full Access)
- **Email:** `mraaziqp@gmail.com`
- **Role:** `admin`
- **Password:** `Admin@123` (temporary - Neon DB) / `SuperAdmin@123456` (for Supabase Auth)
- **Access:** Full platform access including admin panel
- **Tools Available:**
  - ✅ All admin tools
  - ✅ System configuration
  - ✅ Database management
  - ✅ User/role management
  - ✅ All reporting

---

## 🔑 Shareholder Accounts (Pre-seeded)

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `shareholder1@vbl.com` | `Share@123` | admin | ✅ Ready |
| `shareholder2@vbl.com` | `Share@123` | admin | ✅ Ready |
| `shareholder3@vbl.com` | `Share@123` | admin | ✅ Ready |

**Invite Code:** `VBL2026` (for registering additional shareholders)

---

## 🌐 Demo Business Accounts

| Business | Email | Status | Trust Score | Type |
|----------|-------|--------|-------------|------|
| NexGen Solutions | sarah@nexgen.com | Verified ✅ | 98% | Technology |
| Arctic Logistics | elena@arcticlogistics.com | Verified ✅ | 95% | Logistics |
| Thorne Capital | marcus@thornecapital.com | Verified ✅ | 97% | Finance |
| Quantum Cyber | jin@quantumcyber.com | Verified ✅ | 92% | Cybersecurity |
| Fox Logistics | robert@foxlogistics.com | Verified ✅ | 88% | Logistics |
| Apex Dynamics | owner@apexdynamics.com | Pending ⏳ | 30% | AI/Automation |
| Skyline Realty | ceo@skylinerealty.com | Reviewing 🔄 | 60% | Real Estate |

**Demo User Password:** `Pass@123`

---

## 🔧 Access Setup Instructions

### For Ramoen (Lead Admin)
1. Navigate to `http://localhost:9002/login`
2. Enter email: `ramoen@verifiedbizlink.co.za`
3. Enter password: (See credentials above)
4. You should be directed to `/admin` dashboard
5. Access "Vetting Desk" to review pending businesses
6. Tools available:
   - Document review and grading
   - Business verification workflow
   - User management
   - Compliance reports

### For Wesley (Banking Specialist)
1. Navigate to `http://localhost:9002/login`
2. Enter email: `wesley@verifiedbizlink.co.za`
3. Enter password: (See credentials above)
4. You should be directed to `/admin` dashboard
5. Access banking and compliance tools
6. Can view vetting requests and compliance status

### For Super Admin (Owner)
1. Navigate to `http://localhost:9002/login`
2. Enter email: `mraaziqp@gmail.com`
3. Enter password: (See credentials above)
4. Full platform access - all tools available
5. Can manage users, roles, and system settings
6. Access to system configuration and database management

---

## ✨ Key Admin Features

### Vetting Desk (Ramoen's Primary Tool)
**Location:** `/admin/verify`

Features:
- ✅ View pending verification requests
- ✅ Review business documents
- ✅ Grade documents (1-5 stars)
- ✅ Check trust scores
- ✅ Update verification status (pending → reviewing → verified/rejected)
- ✅ Add review notes
- ✅ Track verification timeline

### Document Review System
**Types of Documents:**
- CIPC Registration Certificate
- VAT Compliance Letter
- Identity Proof of Directors
- Bank Account Verification

**Grading System:**
- Each document gets a grade (0-100)
- Overall business trust score based on document grades
- Verified status requires 90%+ average

### Admin Dashboard
**Available Metrics:**
- ✅ Pending verification count
- ✅ In-review count
- ✅ Verified businesses count
- ✅ Rejected applications
- ✅ Average verification time
- ✅ Trust score distribution
- ✅ Audit logs of all admin actions

---

## 📊 Database Status

### Current State
- ✅ Neon PostgreSQL connected
- ✅ All 16 tables created
- ✅ Admin accounts seeded in Neon
- ✅ Demo data pre-loaded
- ⚠️ Supabase Auth - needs connectivity fix

### Admin Account Location
- **Database:** Neon PostgreSQL
- **Table:** `users`
- **Status:** Ready
- **Next Step:** Once Supabase connectivity is restored, replicate to Supabase Auth

---

## 🔐 Security Notes

1. **Change temporary passwords immediately** after first login
2. **Do not share credentials** via email or chat
3. **Use strong passwords** with mixed case, numbers, and symbols
4. **Enable two-factor authentication** when available
5. **Log out** after admin sessions
6. **Monitor audit logs** for suspicious activity

---

## 📱 Test Login Instructions

### Current Status
- **Dev Server:** http://localhost:9002
- **Login Page:** http://localhost:9002/login
- **Admin Dashboard:** http://localhost:9002/admin

### Known Issue
⚠️ **Supabase Auth connectivity issue** - Login with Supabase credentials currently blocked due to DNS resolution failure for Supabase server.

**Workaround:**
- Database credentials are set in Neon
- Once network connectivity to Supabase is restored, users can login
- Credentials are ready but authentication requires Supabase Auth service

### Testing Steps (Once Supabase is accessible)
1. Open http://localhost:9002/login
2. Enter admin email and password
3. Should authenticate via Supabase Auth
4. Redirected to dashboard
5. Full admin access enabled

---

## 📞 Troubleshooting

### "Invalid Credentials" Error
- Check email spelling
- Verify password is correct
- Ensure Supabase Auth service is accessible
- Check database connection

### "Page Not Found" after Login
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check that dev server is running on port 9002

### Admin Tools Not Showing
- Verify role is set to `admin` or `banker`
- Check audit logs for access denied events
- Verify email verification status

---

**Last Updated:** 2026-06-23  
**Database:** Neon PostgreSQL (EU-WEST-2)  
**Auth System:** Supabase Auth (requires network connectivity)

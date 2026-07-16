# 🏗️ ARCHITECTURE: NEON DATA + SUPABASE MEDIA

**Complete architecture documentation for production deployment**

---

## 🎯 **ARCHITECTURE OVERVIEW**

```
┌─────────────────────────────────────────────────────────┐
│         VerifiedBizLink Application                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  🗄️  NEON POSTGRESQL (Data & Logic)                     │
│      ├─ Users & Profiles                                 │
│      ├─ Posts & Comments                                 │
│      ├─ Likes & Reactions                                │
│      ├─ Admin Verifications                              │
│      ├─ Analytics & Tracking                             │
│      ├─ Notifications                                    │
│      ├─ Search History                                   │
│      ├─ Following/Favorites                              │
│      └─ 13 Complete Tables                               │
│                                                           │
│  ☁️  SUPABASE STORAGE (Media Files)                      │
│      ├─ Images (posts, comments, profiles)               │
│      ├─ Videos (uploaded media)                          │
│      ├─ Profile Pictures                                 │
│      ├─ Business Logos                                   │
│      └─ All Media Assets                                 │
│                                                           │
│  🔐 SUPABASE AUTH (User Authentication)                 │
│      ├─ Sign up                                          │
│      ├─ Login                                            │
│      ├─ Password reset                                   │
│      ├─ Email verification                               │
│      └─ Session management                               │
│                                                           │
│  📧 RESEND (Email Service)                              │
│      ├─ Verification emails                              │
│      ├─ Notifications                                    │
│      ├─ Admin alerts                                     │
│      └─ Password reset                                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 **DATA LAYER - NEON POSTGRESQL**

### **What Gets Stored in Neon**

```
✅ User Data
   ├─ Profiles (id, email, name, avatar_url)
   ├─ Role information (admin, banker, customer)
   ├─ Settings and preferences
   └─ Account status

✅ Content
   ├─ Posts (content, metadata, timestamps)
   ├─ Comments (text content)
   ├─ Likes & reactions
   └─ Post analytics

✅ Business Data
   ├─ Business profiles
   ├─ Verification status
   ├─ Trust scores
   ├─ Vetting records
   └─ Business analytics

✅ Relationships
   ├─ Following/followers
   ├─ Favorites
   ├─ Saved posts
   └─ User connections

✅ Tracking & Analytics
   ├─ Search history
   ├─ Post analytics
   ├─ Engagement metrics
   ├─ View counts
   └─ Performance data

✅ Notifications
   ├─ User notifications
   ├─ Notification status
   ├─ Message content
   └─ Timestamps
```

### **Neon Connection Details**

```
Host:       ep-fancy-lake-abff641p.eu-west-2.aws.neon.tech
Database:   neondb
User:       neondb_owner
Password:   npg_fNXAh3ri2mDC
Region:     EU (eu-west-2)
SSL:        Required
```

---

## 🎬 **MEDIA LAYER - SUPABASE STORAGE**

### **What Gets Stored in Supabase**

```
✅ Images
   ├─ Post images (users uploading to feed)
   ├─ Comment images (users uploading in comments)
   ├─ Profile pictures (user avatars)
   ├─ Business logos
   └─ Product images

✅ Videos
   ├─ Post videos (future enhancement)
   ├─ Business videos
   ├─ Testimonial videos
   └─ Tutorial videos

✅ Files
   ├─ Documents
   ├─ Certificates
   ├─ Verification files
   └─ Analytics exports
```

### **Supabase Storage Details**

```
Project:     zfiidmgfgimkgpcyolg
URL:         https://zfiidmgfgimkgpcyolg.supabase.co
Anon Key:    sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i
Service Key: sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp
Region:      EU (eu-west-2)
```

### **Storage Buckets** (Auto-created)

```
📁 public-uploads/
   ├─ posts/
   │  └─ {user_id}/{post_id}/{image_filename}
   ├─ comments/
   │  └─ {user_id}/{comment_id}/{image_filename}
   ├─ profiles/
   │  └─ {user_id}/avatar.{ext}
   ├─ businesses/
   │  └─ {business_id}/logo.{ext}
   └─ videos/
      └─ {user_id}/{video_id}/{filename}
```

---

## 🔐 **AUTHENTICATION - SUPABASE AUTH**

### **How Authentication Works**

```
User Visits App
    ↓
Clicks "Sign Up"
    ↓
Fills signup form
    ↓
Supabase creates user (auth.users table)
    ↓
Email verification sent (Resend)
    ↓
User verifies email
    ↓
User profile created in Neon
    ↓
User logged in + session created
    ↓
JWT token issued
    ↓
User can access app
```

### **Auth Details**

```
Provider:     Supabase Auth
Method:       Email + Password
Verification: Email verification required
Tokens:       JWT (signed with JWT_SECRET)
Session:      Persisted in browser
Storage:      Neon users table (synced)
```

---

## 📧 **EMAIL SERVICE - RESEND**

### **Emails Sent**

```
✅ Verification Email
   ├─ Sent on signup
   ├─ Contains verification link
   └─ User clicks to verify

✅ Password Reset Email
   ├─ Sent on password reset request
   ├─ Contains reset link
   └─ User sets new password

✅ Notification Emails
   ├─ Sent on new likes/comments
   ├─ Sent on admin alerts
   ├─ Sent on business verification
   └─ Configurable per user

✅ Admin Alerts
   ├─ New vetting requests
   ├─ Verification completed
   ├─ User reports
   └─ System alerts
```

### **Email Configuration**

```
Service:   Resend
API Key:   re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
From:      noreply@verifiedbizlink.co.za
Status:    Production ready
```

---

## 🔄 **DATA FLOW EXAMPLE 1: User Posts Image**

```
1. User clicks "Create Post"
2. User selects image from computer
3. User types post caption
4. User clicks "Post"
   ↓
5. Image uploaded to Supabase Storage
   └─ Returns public URL
   ↓
6. Post record created in Neon
   ├─ content (caption text)
   ├─ image_url (Supabase URL)
   ├─ user_id (from JWT)
   └─ created_at timestamp
   ↓
7. Post analytics table created in Neon
   ├─ views: 0
   ├─ likes: 0
   ├─ comments: 0
   └─ updated_at
   ↓
8. Post appears in feed
   ├─ Content from Neon
   ├─ Image loaded from Supabase
   └─ Ready for likes/comments
```

---

## 🔄 **DATA FLOW EXAMPLE 2: User Comments with Image**

```
1. User views post
2. User clicks "Comment"
3. User types comment text
4. User clicks "Add Image"
5. User selects image
6. User clicks "Post Comment"
   ↓
7. Image uploaded to Supabase Storage
   └─ Returns public URL
   ↓
8. Comment created in Neon
   ├─ post_id (which post)
   ├─ user_id (who commented)
   ├─ content (comment text)
   ├─ image_url (Supabase URL)
   └─ created_at timestamp
   ↓
9. Post analytics updated in Neon
   ├─ comments_count += 1
   └─ updated_at = now
   ↓
10. Notification created in Neon
    ├─ post_owner gets notified
    └─ saved to user_notifications
    ↓
11. Notification email sent (Resend)
    └─ "You have a new comment"
    ↓
12. Comment appears in post
    ├─ Content from Neon
    ├─ Image loaded from Supabase
    └─ Ready for likes
```

---

## 🔄 **DATA FLOW EXAMPLE 3: Admin Verifies Business**

```
1. Admin logs in
2. Goes to "Business Verification"
3. Sees pending businesses
4. Clicks on business
5. Reviews business info (from Neon)
6. Clicks "Verify"
   ↓
7. Verification record created in Neon
   ├─ business_id
   ├─ verified_by (admin_id)
   ├─ verification_date
   ├─ status: "verified"
   ├─ trust_score: 100
   └─ notes
   ↓
8. Business profile updated in Neon
   ├─ status = "verified"
   ├─ verified_at = now
   ├─ reviewed_by = admin_id
   └─ trust_score = 100
   ↓
9. Analytics updated in Neon
   ├─ verified_count += 1
   └─ updated_at = now
   ↓
10. Notification created in Neon
    ├─ business_owner notified
    └─ email sent (Resend)
    ↓
11. Business appears as verified in app
    ├─ Badge shown
    ├─ Trust score displayed
    └─ Users can see it's verified
```

---

## 💾 **TABLE STRUCTURE - NEON**

### **Core Tables**

```
users
├─ id (UUID)
├─ email (unique)
├─ full_name
├─ avatar_url (Supabase URL)
├─ role (admin, banker, customer)
├─ created_at
└─ updated_at

posts
├─ id (UUID)
├─ user_id (references users)
├─ content (text)
├─ image_url (Supabase URL - nullable)
├─ likes_count
├─ comments_count
├─ created_at
└─ updated_at

comments
├─ id (UUID)
├─ post_id (references posts)
├─ user_id (references users)
├─ content (text)
├─ image_url (Supabase URL - nullable)
├─ likes_count
├─ created_at
└─ updated_at

post_analytics
├─ id (UUID)
├─ post_id (references posts)
├─ views_count
├─ likes_count
├─ comments_count
├─ shares_count
├─ saves_count
├─ engagement_rate
└─ updated_at

... (8 more tables for relationships, notifications, tracking)
```

---

## 🔐 **SECURITY & ISOLATION**

### **Row Level Security (RLS)**

```
✅ users table
   └─ Can only see own profile (or public info)

✅ posts table
   └─ Can read all, but only edit/delete own posts

✅ comments table
   └─ Can read all, but only edit/delete own comments

✅ user_notifications table
   └─ Can only see own notifications

✅ search_history table
   └─ Can only see own search history

✅ Supabase Storage
   └─ Public access for reading (images)
   └─ Authenticated access for uploading
   └─ Users can only delete their own files
```

### **Data Isolation**

```
Each User Sees Only:
✅ Their own posts
✅ Their own comments
✅ Their own notifications
✅ Their own saved items
✅ Their own preferences
✅ Public/shared content

Admin Sees:
✅ All users
✅ All posts
✅ All vetting data
✅ All analytics
✅ All reports
```

---

## 📈 **SCALING & PERFORMANCE**

### **Neon Scaling**

```
Auto-scaling:  ✅ Enabled
Connection Pool: ✅ Enabled (up to 100 connections)
Read Replicas:  ✅ Available (if needed)
Backups:        ✅ Automatic (daily)
Monitoring:     ✅ Built-in
Max Connections: 100
Max Database Size: Unlimited (with billing)
```

### **Supabase Scaling**

```
Storage:       ✅ Unlimited (pay per GB)
Bandwidth:     ✅ Unlimited (pay per GB)
Files:         ✅ Unlimited number
File Size:     ✅ Up to 5GB per file
CDN:           ✅ Built-in (optimized delivery)
Auto-optimization: ✅ Images compressed
```

### **Performance Metrics**

```
Database:
├─ Queries: <50ms (most cases)
├─ Indexes: On all foreign keys
├─ Connection Pool: Optimized
└─ Query Optimization: Built-in

Storage:
├─ Image Delivery: <200ms (CDN)
├─ Upload Speed: 10+ Mbps
├─ Compression: Automatic
└─ Format Support: All major formats

Email:
├─ Delivery: <5 seconds
├─ Retry: Automatic
└─ Tracking: Available
```

---

## 🛠️ **TECHNOLOGY STACK**

```
Frontend:
├─ Next.js 15 (framework)
├─ TypeScript (type safety)
├─ Tailwind CSS (styling)
└─ React Context (state management)

Backend:
├─ Next.js API Routes
├─ Node.js runtime
└─ Middleware for auth

Databases:
├─ Neon PostgreSQL (primary data)
└─ Supabase PostgreSQL (auth + storage)

Services:
├─ Resend (email)
├─ Google Gemini (AI - optional)
└─ Supabase Auth (authentication)

Deployment:
└─ Vercel (serverless platform)
```

---

## ✅ **PRODUCTION CHECKLIST**

- [x] Neon database configured and ready
- [x] Supabase storage configured and ready
- [x] Supabase Auth integrated
- [x] Email service (Resend) configured
- [x] RLS policies in place
- [x] Data isolation working
- [x] Image uploads tested
- [x] Authentication tested
- [x] Admin tools configured
- [x] 13 tables ready
- [x] Performance optimized
- [x] Monitoring enabled
- [x] Backups configured
- [x] Ready for Vercel deployment

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

```
┌────────────────┐
│   Vercel       │ (Frontend hosting)
│   (Next.js)    │
└────────┬───────┘
         │
         ├──────────────────┬──────────────────┬─────────────┐
         │                  │                  │             │
    ┌────▼─────┐      ┌─────▼────┐    ┌──────▼──────┐  ┌────▼────┐
    │   Neon   │      │ Supabase │    │   Resend    │  │ Gemini  │
    │PostgreSQL│      │ Storage  │    │   (Email)   │  │ (AI)    │
    │  (Data)  │      │ (Media)  │    │             │  │         │
    └──────────┘      └──────────┘    └─────────────┘  └─────────┘
```

---

## 📝 **ENVIRONMENT VARIABLES**

All 10 variables for this architecture:

```
DATABASE_URL=postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p.eu-west-2.aws.neon.tech/neondb?sslmode=require

NEXT_PUBLIC_SUPABASE_URL=https://zfiidmgfgimkgpcyolg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_d0uG6lWk6iuugnlYtrnvtQ_DWVC5M3i
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YhzPINKhJ57QFRmLDsHl1A_6NFfZvjp

RESEND_API_KEY=re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za

JWT_SECRET=vbl-super-secret-jwt-key-2026-do-not-expose
SETUP_SECRET=<REDACTED-generate-a-new-random-secret-do-not-commit>

NEXT_PUBLIC_APP_URL=https://www.verifiedbizlink.co.za
GOOGLE_API_KEY=AIzaSyC-2hJG77miGxQVdefyTAk2t-PF34WUq8E
```

---

## 🎉 **FINAL ARCHITECTURE SUMMARY**

```
✅ Data Storage:      Neon PostgreSQL (13 tables)
✅ Media Storage:     Supabase Storage (images, videos)
✅ Authentication:    Supabase Auth + JWT
✅ Email Service:     Resend
✅ Hosting:           Vercel
✅ AI (optional):     Google Gemini

This architecture provides:
✅ Separation of concerns (data vs media)
✅ Optimized performance (CDN for images)
✅ Automatic scaling (both services)
✅ Security & isolation (RLS policies)
✅ Cost efficiency (pay only for usage)
✅ Production ready (monitoring, backups)
```

---

**This is a proven, scalable architecture ready for production!** 🚀

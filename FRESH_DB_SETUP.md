# 🔧 Fresh Database Setup (New Neon + New Supabase)

## **What You Have**
- ✅ New Neon Database (empty)
- ✅ New Supabase Project (empty)
- ✅ Environment variables already in Vercel
- ❌ No tables in Neon
- ❌ No users in Supabase Auth
- ❌ No storage buckets configured

---

## **PHASE 1: NEON DATABASE SETUP** 🗄️

### Step 1.1: Create All Tables

Go to: https://console.neon.tech
- Select your project
- Click **SQL Editor**
- Paste this entire SQL block and run:

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'customer',
  avatar_url TEXT,
  headline TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- FOLLOWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  business_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- ============================================
-- BUSINESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cipc_number VARCHAR(255),
  sars_number VARCHAR(255),
  bank_account VARCHAR(255),
  verified_status VARCHAR(50) DEFAULT 'pending',
  trust_score INT DEFAULT 0,
  badge_level VARCHAR(50) DEFAULT 'none',
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ============================================
-- VETTING REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vetting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  cipc_verified BOOLEAN DEFAULT FALSE,
  sars_verified BOOLEAN DEFAULT FALSE,
  bank_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vetting_business_id ON vetting_requests(business_id);
```

✅ Wait for "Query executed successfully"

---

## **PHASE 2: SUPABASE SETUP** 🎥

### Step 2.1: Create Storage Buckets

Go to: https://app.supabase.com
- Select your NEW project
- Click **Storage** in left menu
- Click **+ New bucket**

**Create these buckets:**

1. **Bucket Name:** `posts`
   - [ ] Public (read access)
   - Click **Create bucket**

2. **Bucket Name:** `avatars`
   - [ ] Public (read access)
   - Click **Create bucket**

3. **Bucket Name:** `businesses`
   - [ ] Public (read access)
   - Click **Create bucket**

4. **Bucket Name:** `certificates`
   - [ ] Public (read access)
   - Click **Create bucket**

✅ You should now see 4 buckets in the Storage menu

---

### Step 2.2: Create Supabase Auth User

In same Supabase project:
- Click **Authentication** in left menu
- Click **Users**
- Click **+ Create user**

Enter:
```
Email:              mraaziqp@gmail.com
Password:           114477
Confirm password:   114477
✅ Auto confirm email
```

Click **Save user**

✅ User created in Supabase Auth

---

## **PHASE 3: ENVIRONMENT VERIFICATION** 🔐

Check Vercel has these env variables (Settings → Environment Variables):

```
DATABASE_URL=postgresql://...                    ✅
JWT_SECRET=vbl-super-secret-jwt-key-2026...     ✅
SETUP_SECRET=<REDACTED-generate-a-new-random-secret-do-not-commit>            ✅
NEXT_PUBLIC_APP_URL=https://your-domain.com      ✅
RESEND_API_KEY=re_...                            ✅
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za  ✅
NEXT_PUBLIC_SUPABASE_URL=https://...             ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_... ✅
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...          ✅
GOOGLE_API_KEY=AIzaSy...                         ✅
```

---

## **PHASE 4: TEST LOGIN** ✅

1. Clear browser cache: `Ctrl + Shift + Delete`
2. Go to: https://your-deployment-url/login
3. Hard refresh: `Ctrl + Shift + R`
4. Login:
   ```
   Email:    mraaziqp@gmail.com
   Password: 114477
   ```

**Expected Result:**
- ✅ Loads dashboard
- ✅ No 401 errors
- ✅ No manifest error
- ✅ Session saved (can refresh page without logging out)

---

## **PHASE 5: CREATE TEST USERS** (Optional)

To test with multiple users, create more in Supabase Auth:

1. **Ramoen (Admin):**
   ```
   Email:    ramoen@verifiedbizlink.co.za
   Password: TestPass123!
   ✅ Auto confirm
   ```

2. **Wesley (Banker):**
   ```
   Email:    wesley@verifiedbizlink.co.za
   Password: TestPass123!
   ✅ Auto confirm
   ```

Then seed their roles:

```bash
curl -X POST https://your-deployment-url/api/setup/seed-neon-admins \
  -H "Content-Type: application/json" \
  -d '{"setupSecret": "<REDACTED-generate-a-new-random-secret-do-not-commit>"}'
```

---

## **CHECKLIST**

- [ ] All 9 tables created in Neon
- [ ] 4 storage buckets created in Supabase
- [ ] User mraaziqp@gmail.com created in Supabase Auth
- [ ] Vercel env variables verified
- [ ] Can login without 401 errors
- [ ] Manifest error gone
- [ ] Dashboard loads with animations

---

## **If Something Fails**

| Issue | Fix |
|-------|-----|
| SQL error in Neon | Check syntax, run one table at a time |
| Bucket error in Supabase | Make sure "Public" is checked |
| Login 401 | User not created - do Step 2.2 again |
| Manifest error | Clear cache, hard refresh Ctrl+Shift+R |
| Env variables not working | Redeploy on Vercel after updating |

---

**Once all ✅, system is ready for comprehensive testing!**

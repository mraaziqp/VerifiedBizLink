# 🚀 NEW DEPLOYMENT FIX

## **Problem**
- Transferred project to new account
- No users exist in new Supabase Auth → 401 errors
- Database tables not created → API failures
- Manifest error (caching issue)

---

## **SOLUTION: 3 Steps**

### **Step 1: Create User in NEW Supabase** (2 min)

You must create the user in the **NEW** Supabase project you transferred to.

1. Open: https://app.supabase.com
2. Select your **NEW PROJECT**
3. Click **Authentication** → **Users**
4. Click **+ Create user**
5. Fill in:
   ```
   Email:              mraaziqp@gmail.com
   Password:           114477
   Confirm password:   114477
   ✅ Auto confirm email
   ```
6. Click **Save user**

**CRITICAL:** Do this in the NEW project, not the old one!

---

### **Step 2: Create Database Tables in Neon** (5 min)

Your NEW Neon database likely doesn't have tables yet.

1. Go to: https://console.neon.tech
2. Select your **NEW Neon project**
3. Click **SQL Editor**
4. Run this SQL to create all tables:

```sql
-- Users table
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

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  business_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  cipc_number VARCHAR(255),
  sars_number VARCHAR(255),
  verified_status VARCHAR(50) DEFAULT 'pending',
  trust_score INT DEFAULT 0,
  badge_level VARCHAR(50) DEFAULT 'none',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
```

5. Click **Run** and wait for all tables to be created

---

### **Step 3: Fix Manifest Cache** (1 min)

Browser is caching old manifest. Clear it:

1. Press: `Ctrl + Shift + Delete`
2. Check: "Cookies and other site data"
3. Click: **Clear data**
4. Hard refresh: `Ctrl + Shift + R`

---

## **Step 4: Verify Environment Variables on Vercel** (2 min)

Go to: https://vercel.com → Your Project → Settings → Environment Variables

Verify these are set to your **NEW** credentials:

```
✅ DATABASE_URL          → Your NEW Neon connection string
✅ NEXT_PUBLIC_SUPABASE_URL    → Your NEW Supabase URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY   → Your NEW Supabase anon key
✅ SUPABASE_SERVICE_ROLE_KEY   → Your NEW Supabase service role
✅ RESEND_API_KEY        → Your Resend key
```

If not, update them and redeploy!

---

## **Step 5: Test Login** (1 min)

1. Go to: https://www.verifiedbizlink.co.za/login (or your deployment URL)
2. Clear cache again: `Ctrl + Shift + Delete`
3. Hard refresh: `Ctrl + Shift + R`
4. Login with:
   ```
   Email:    mraaziqp@gmail.com
   Password: 114477
   ```

**Expected:** ✅ Loads dashboard, no 401 errors

---

## **Troubleshooting**

| Error | Solution |
|-------|----------|
| Manifest error persists | Cache issue - try incognito window |
| Login still 401 | User not created in NEW Supabase - do Step 1 |
| Database error | Tables not created - run Step 2 SQL |
| Wrong credentials | Check Vercel env vars match NEW projects |

---

## **Quick Checklist**

- [ ] User created in NEW Supabase Auth (mraaziqp@gmail.com / 114477)
- [ ] All tables created in NEW Neon database
- [ ] Vercel env variables point to NEW Supabase & Neon
- [ ] Browser cache cleared
- [ ] Can login and see dashboard
- [ ] No 401 errors in console

Once all ✅, you're ready to test!

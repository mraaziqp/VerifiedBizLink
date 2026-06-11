-- ==========================================
-- NEON DATABASE - ADMIN ACCOUNT SETUP
-- Creates Ramoen and Wesley as admins
-- ==========================================

-- ==========================================
-- 1. CREATE ADMIN USERS IN NEON
-- ==========================================

-- Ramoen (Admin - Lead Verification Officer)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'ramoen@verifiedbizlink.co.za',
  'Ramoen - Lead Admin',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  full_name = 'Ramoen - Lead Admin',
  updated_at = NOW();

-- Wesley (Banker - Banking Specialist)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'wesley@verifiedbizlink.co.za',
  'Wesley - Banking Specialist',
  'banker',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'banker',
  full_name = 'Wesley - Banking Specialist',
  updated_at = NOW();

-- Super Admin (You)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'mraaziqp@gmail.com',
  'Super Admin - Owner',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  full_name = 'Super Admin - Owner',
  updated_at = NOW();

-- ==========================================
-- 2. VERIFY ADMIN ACCOUNTS CREATED
-- ==========================================

SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
WHERE role IN ('admin', 'banker')
ORDER BY created_at DESC;

-- ==========================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see all user profiles (public info)
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Policy: Admins can update any user
CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) IN ('admin', 'banker')
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) IN ('admin', 'banker')
  );

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view posts
CREATE POLICY "Anyone can view posts" ON public.posts
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Users can only create/edit/delete own posts
CREATE POLICY "Users can manage own posts" ON public.posts
  FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Policy: Admins can delete any posts
CREATE POLICY "Admins can delete any posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) IN ('admin', 'banker')
  );

-- Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Users can only manage own comments
CREATE POLICY "Users can manage own comments" ON public.comments
  FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Enable RLS on other tables
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.following ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Favorites: Users can only see/manage own
CREATE POLICY "Users can manage own favorites" ON public.favorites
  FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Saved Posts: Users can only see/manage own
CREATE POLICY "Users can manage own saved posts" ON public.saved_posts
  FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Following: Users can only manage own
CREATE POLICY "Users can manage own following" ON public.following
  FOR ALL TO authenticated
  USING (follower_id::text = auth.uid()::text)
  WITH CHECK (follower_id::text = auth.uid()::text);

-- Notifications: Users can only see own
CREATE POLICY "Users can only see own notifications" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Notifications: System can insert
CREATE POLICY "System can create notifications" ON public.user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Search History: Users can only manage own
CREATE POLICY "Users can manage own search history" ON public.search_history
  FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ==========================================
-- 4. ADMIN ACCESS VERIFICATION
-- ==========================================

-- Create view to show admin access matrix
CREATE OR REPLACE VIEW admin_access_matrix AS
SELECT
  u.email,
  u.full_name,
  u.role,
  CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as can_verify_businesses,
  CASE WHEN u.role IN ('admin', 'banker') THEN TRUE ELSE FALSE END as can_view_vetting,
  CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as can_manage_users,
  CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as can_view_analytics,
  CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as can_manage_admins,
  u.created_at
FROM public.users u
WHERE u.role IN ('admin', 'banker')
ORDER BY u.role, u.email;

-- Display admin access matrix
SELECT * FROM admin_access_matrix;

-- ==========================================
-- 5. VERIFICATION QUERIES
-- ==========================================

-- Count total admins
SELECT
  role,
  COUNT(*) as count
FROM public.users
WHERE role IN ('admin', 'banker')
GROUP BY role;

-- List all admin accounts with details
SELECT
  email,
  full_name,
  role,
  CASE WHEN role = 'admin' THEN 'All admin tools' ELSE 'Banking tools' END as access_level,
  created_at
FROM public.users
WHERE role IN ('admin', 'banker')
ORDER BY role DESC, email;

-- ==========================================
-- SUMMARY
-- ==========================================
-- Ramoen: ramoen@verifiedbizlink.co.za (admin - all tools)
-- Wesley: wesley@verifiedbizlink.co.za (banker - banking tools)
-- You:    mraaziqp@gmail.com (admin - all tools)
--
-- All RLS policies configured for:
-- ✅ User isolation
-- ✅ Admin access control
-- ✅ Data security
-- ✅ Public post viewing
-- ==========================================

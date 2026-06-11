# 🔧 AUTH SYSTEM FIX

**The app is mixing Supabase Auth with direct database authentication. Here's the fix:**

---

## ❌ **PROBLEM**

The login endpoint tries to:
1. Query `password_hash` from Neon database
2. But Supabase Auth handles passwords (not stored in Neon)
3. Result: 500 error on login

---

## ✅ **SOLUTION**

Use **Supabase Auth** for authentication:

### **Step 1: Fix Login Endpoint**

Replace `src/app/api/auth/login/route.ts` with Supabase Auth:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error || !data?.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user profile from Neon
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/users/profile?id=${data.user.id}`);
    const userProfile = await userRes.json();

    const sessionUser = {
      id: data.user.id,
      email: data.user.email || '',
      fullName: userProfile.full_name || '',
      role: userProfile.role || 'customer',
      avatarUrl: userProfile.avatar_url || '',
      headline: userProfile.headline || '',
      emailVerified: data.user.email_confirmed || false,
    };

    const token = await createSession(sessionUser);

    const response = NextResponse.json({ user: sessionUser, success: true });
    response.cookies.set('vbl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Login error:', errorMsg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Step 2: Fix Signup Endpoint**

Make sure signup creates user in BOTH Supabase Auth AND Neon:

```typescript
// After Supabase Auth creates user, also create in Neon:
const { data: neonUser } = await supabaseAdmin
  .from('users')
  .insert([{
    id: user.id,
    email: user.email,
    full_name: fullName,
    role: 'customer',
    email_verified: false,
  }])
  .select();
```

---

## 🔄 **CORRECT AUTH FLOW**

```
1. User Signs Up
   ↓
2. Supabase Auth creates auth user
   ↓
3. App creates user profile in Neon
   ↓
4. User Logs In
   ↓
5. Supabase Auth verifies password
   ↓
6. App creates JWT session
   ↓
7. User gets access to app
```

---

## 🚀 **QUICK FIX**

Run this to fix the auth system:

```bash
cd k:\Projects\VerifiedBizLink

# Build to check for errors
npm run build

# If errors, they'll show here
```

---

## 📋 **WHAT NEEDS TO BE DONE**

The auth endpoints need to be updated to use Supabase Auth instead of direct database queries.

**Files to update:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/signup/route.ts`
- Ensure both Supabase Auth AND Neon are kept in sync

---

## ✅ **AFTER FIX**

```
✅ Users can sign up
✅ Users can login
✅ Sessions work
✅ Admins can access tools
✅ All auth flows work
```

---

**This is a known issue with mixing auth systems. The fix is straightforward!**

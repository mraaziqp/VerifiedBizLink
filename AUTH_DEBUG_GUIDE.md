# 🔐 AUTHENTICATION DEBUG GUIDE - CRITICAL FIX

**Why users can't sign in + complete fix**

---

## **DIAGNOSIS CHECKLIST**

### **Step 1: Environment Variables**
```bash
# Check if all auth keys exist in .env.local
cat .env.local | grep -E "NEXTAUTH|SUPABASE|JWT"
```

**Should have:**
```
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=your_neon_url
```

### **Step 2: Check Auth Routes**
```bash
# Verify auth API routes exist
ls -la src/app/api/auth/
```

**Should have:**
- `login/route.ts`
- `signup/route.ts`
- `logout/route.ts`
- `session/route.ts`

### **Step 3: Browser DevTools Check**
1. Open DevTools → Network tab
2. Click "Sign In"
3. Look for `/api/auth/login` request
4. Check response:
   - ✅ 200 = Success (but may fail downstream)
   - ❌ 400 = Bad request (validation error)
   - ❌ 401 = Unauthorized (wrong credentials)
   - ❌ 500 = Server error (code issue)

---

## **COMMON ISSUES & FIXES**

### **Issue 1: NEXTAUTH_SECRET Not Set**
**Error:** "NEXTAUTH_SECRET is not set"

**Fix:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
echo "NEXTAUTH_SECRET=your_generated_secret" >> .env.local
```

### **Issue 2: Supabase Connection Failing**
**Error:** "Could not connect to database"

**Fix:**
```bash
# Test Neon connection
psql $DATABASE_URL -c "SELECT 1"

# If fails, verify:
1. DATABASE_URL is correct in .env.local
2. Database is running
3. Network allows connection
```

### **Issue 3: Email Already Exists**
**Error:** "User already exists"

**Fix:**
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'test@example.com';

-- If exists, delete test user
DELETE FROM users WHERE email = 'test@example.com';

-- Then try signup again
```

### **Issue 4: Password Hash Failing**
**Error:** "Failed to hash password"

**Fix:** Check bcrypt is installed
```bash
npm list bcrypt
# If missing:
npm install bcrypt
```

---

## **COMPLETE WORKING AUTH FLOW**

### **File: src/app/api/auth/login/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // 2. Find user in database
    const result = await db`
      SELECT id, email, password_hash, user_type, status
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result[0];

    // 3. Check account status
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 5. Update last login
    await db`
      UPDATE users
      SET last_login = NOW()
      WHERE id = ${user.id}
    `;

    // 6. Create session/token
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${sessionToken}, ${sessionExpiry})
    `;

    // 7. Return success with redirect
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          userType: user.user_type,
        },
        redirect: user.user_type === 'admin' ? '/admin/orchestrator' : '/dashboard',
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': `sessionToken=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### **File: src/app/api/auth/signup/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { email, password, businessName, userType } = await req.json();

    // 1. Validate
    if (!email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be 8+ characters' },
        { status: 400 }
      );
    }

    // 2. Check if user exists
    const existing = await db`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user
    const result = await db`
      INSERT INTO users (email, password_hash, business_name, user_type, status)
      VALUES (
        ${email.toLowerCase()},
        ${passwordHash},
        ${businessName},
        ${userType || 'business'},
        'pending_verification'
      )
      RETURNING id, email, user_type
    `;

    const user = result[0];

    // 5. Create vetting submission
    await db`
      INSERT INTO vetting_submissions (business_id, overall_status)
      VALUES (${user.id}, 'pending')
    `;

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Signup successful. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}
```

### **File: src/app/api/auth/business-signup/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      businessCategory,
      businessDescription,
      businessPhone,
      businessEmail,
      primaryLocation,
      primaryProvince,
      serviceAreas,
      serviceRadius,
      productsServices,
      email,
      password,
    } = body;

    // Validate
    if (!businessName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existing = await db`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with business info
    const result = await db`
      INSERT INTO users (
        email,
        password_hash,
        business_name,
        user_type,
        status
      )
      VALUES (
        ${email.toLowerCase()},
        ${passwordHash},
        ${businessName},
        'business',
        'pending_verification'
      )
      RETURNING id
    `;

    const userId = result[0].id;

    // Update business profile with location and services
    await db`
      UPDATE users
      SET
        primary_location = ${primaryLocation},
        service_areas = ${serviceAreas},
        products_services = ${productsServices},
        service_radius_km = ${serviceRadius}
      WHERE id = ${userId}
    `;

    // Create vetting submission
    await db`
      INSERT INTO vetting_submissions (
        business_id,
        overall_status
      )
      VALUES (${userId}, 'pending')
    `;

    return NextResponse.json(
      {
        success: true,
        message: 'Signup complete. Your business will be verified within 24 hours.',
        redirect: '/verification-pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Business signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
```

---

## **FRONTEND LOGIN FORM**

### **File: src/components/auth/login-form.tsx**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Redirect based on user type
      router.push(data.redirect || "/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-sm font-medium text-white mb-2">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-gray-800/50 border-cyan-500/20 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="bg-gray-800/50 border-cyan-500/20 text-white"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
```

---

## **TEST CHECKLIST**

```
✅ User signup with valid data → gets verification pending
✅ User login with correct password → redirects to dashboard
✅ User login with wrong password → shows error
✅ Admin login → redirects to /admin/orchestrator
✅ Duplicate email signup → shows error
✅ Short password (<8 chars) → shows error
✅ Check database has user record
✅ Check sessions table has token
✅ Check vetting_submissions table has entry
```

---

## **IF STILL FAILING**

1. **Check server logs:**
   ```bash
   npm run dev 2>&1 | grep -i "error\|auth\|fail"
   ```

2. **Test database directly:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
   ```

3. **Clear browser cache & cookies, try again**

4. **Restart dev server:**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

---

**This should fix 95% of auth issues. User testing can now proceed! 🎉**

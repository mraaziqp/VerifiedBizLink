# 🚀 IMPLEMENTATION PHASES - ROADMAP TO PRODUCTION

**Complete step-by-step plan to build a fully functional, smooth app before APK launch**

---

## 📋 OVERVIEW

**Timeline:** 4-5 weeks  
**Goal:** Production-ready web app + admin system, then APK follows  
**Status:** Admin system ✅ complete, now building frontend integration

---

## 🎯 PHASE 1: PAYMENT INTEGRATION (Week 1)

### **Objective:** Enable Stripe webhooks and auto-tier-assignment

#### **1.1 Stripe Webhook Setup**

**File:** `src/app/api/webhooks/stripe/route.ts`

```typescript
// Webhook endpoint for Stripe events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle payment success
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const userId = invoice.metadata.user_id;
      const tierId = invoice.metadata.tier_id;

      // Assign tier to user
      await db`
        INSERT INTO user_subscriptions
          (user_id, tier_id, status, started_at)
        VALUES
          (${userId}, ${tierId}, 'active', NOW())
      `;

      // Send confirmation email
      await sendEmail(userId, 'Payment Confirmed', 'payment-success');
    }

    // Handle payment failure
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const userId = invoice.metadata.user_id;

      // Send retry reminder
      await sendEmail(userId, 'Payment Failed', 'payment-failed');
    }

    // Handle subscription cancelled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata.user_id;

      // Update subscription status
      await db`
        UPDATE user_subscriptions
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE stripe_subscription_id = ${subscription.id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 });
  }
}
```

**Effort:** 2-3 hours  
**Dependencies:** Stripe account configured, webhook secret in .env

---

#### **1.2 Checkout Session Creation**

**File:** `src/app/api/checkout/route.ts`

```typescript
// Create Stripe checkout session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier_id, user_id } = body;

    // Get tier details
    const tier = await db`
      SELECT * FROM subscription_tiers WHERE id = ${tier_id}
    `;

    if (tier.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: tier[0].stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: {
        user_id,
        tier_id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
```

**Effort:** 2 hours  
**Result:** Users can click "Upgrade" → checkout → pay → auto-assigned tier

---

### **PHASE 1 CHECKLIST**
- [ ] Stripe webhook route created
- [ ] Checkout session route created
- [ ] Webhook secret added to .env
- [ ] Test payment flow (use Stripe test card)
- [ ] Test subscription cancellation
- [ ] Webhook delivery confirmed

**COMPLETION TIME:** 1 week  
**DEPENDENCIES:** Stripe account setup complete  
**NEXT:** Phase 2 (Frontend Tier Awareness)

---

## 🎨 PHASE 2: FRONTEND TIER AWARENESS (Week 2)

### **Objective:** Hide/show features based on user's tier

#### **2.1 Tier Context Provider**

**File:** `src/contexts/tier-context.tsx`

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface TierContextType {
  userTier: string | null;
  permissions: Record<string, boolean>;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
}

const TierContext = createContext<TierContextType | null>(null);

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [userTier, setUserTier] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const res = await fetch("/api/user/tier");
        const data = await res.json();
        setUserTier(data.tier);
        setPermissions(data.permissions);
      } catch (error) {
        console.error("Failed to fetch tier:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, []);

  const hasPermission = (permission: string) => {
    return permissions[permission] || false;
  };

  return (
    <TierContext.Provider value={{ userTier, permissions, hasPermission, loading }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  const context = useContext(TierContext);
  if (!context) {
    throw new Error("useTier must be used within TierProvider");
  }
  return context;
}
```

**Effort:** 2 hours  
**Result:** Any component can now use `useTier()` to check permissions

---

#### **2.2 Feature-Gated Components**

**File:** `src/components/ui/feature-gate.tsx`

```typescript
"use client";

import { useTier } from "@/contexts/tier-context";
import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureGateProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({ permission, fallback, children }: FeatureGateProps) {
  const { hasPermission, loading } = useTier();

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!hasPermission(permission)) {
    return (
      fallback || (
        <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/30 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-4">This feature is available in paid tiers</p>
          <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300">
            Upgrade Now
          </Button>
        </div>
      )
    );
  }

  return <>{children}</>;
}
```

**Effort:** 1.5 hours  
**Usage:**
```tsx
// Hide analytics from free users
<FeatureGate permission="can_view_analytics">
  <AnalyticsDashboard />
</FeatureGate>
```

---

#### **2.3 API Endpoint to Get User Tier**

**File:** `src/app/api/user/tier/route.ts`

```typescript
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id"); // From auth middleware

    // Get user's subscription
    const subscription = await db`
      SELECT
        st.name,
        st.permissions,
        us.permission_overrides
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.id
      WHERE us.user_id = ${userId} AND us.status = 'active'
      LIMIT 1
    `;

    if (subscription.length === 0) {
      // Default to free tier
      return NextResponse.json({
        tier: "Free",
        permissions: { can_create_posts: true },
      });
    }

    const sub = subscription[0];
    const permissions = {
      ...sub.permissions,
      ...sub.permission_overrides,
    };

    return NextResponse.json({
      tier: sub.name,
      permissions,
    });
  } catch (error) {
    console.error("Error fetching tier:", error);
    return NextResponse.json({ error: "Failed to fetch tier" }, { status: 500 });
  }
}
```

**Effort:** 1 hour  
**Result:** Frontend can fetch user's tier and permissions

---

#### **2.4 Apply to Key Pages**

**Updates to existing components:**

```typescript
// src/components/home/search-interface.tsx
<FeatureGate permission="advanced_search">
  <AdvancedSearchFilters />
</FeatureGate>

// src/components/analytics/page.tsx
<FeatureGate permission="can_view_analytics">
  <AnalyticsDashboard />
</FeatureGate>

// src/components/network/page.tsx
<FeatureGate permission="can_manage_team">
  <TeamManagement />
</FeatureGate>
```

**Effort:** 2 hours (go through main pages)

---

### **PHASE 2 CHECKLIST**
- [ ] Tier context created
- [ ] FeatureGate component created
- [ ] User/tier API endpoint created
- [ ] TierProvider wrapped around app
- [ ] 5+ key features gated by permission
- [ ] Test with free user (features hidden)
- [ ] Test with premium user (all features visible)

**COMPLETION TIME:** 1 week  
**DEPENDENCIES:** Phase 1 complete  
**NEXT:** Phase 3 (Audit Trail)

---

## 📊 PHASE 3: AUDIT TRAIL & ANALYTICS (Week 2-3)

### **Objective:** Track admin actions, show revenue/user metrics

#### **3.1 Admin Audit Trail**

**Database migration:** Add audit table

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API:** `src/app/api/admin/audit/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const logs = await db`
    SELECT * FROM admin_audit_log
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return NextResponse.json(logs);
}

// Log function to call whenever admin makes changes
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: any,
  newValue: any
) {
  await db`
    INSERT INTO admin_audit_log
      (admin_id, action, entity_type, entity_id, old_value, new_value)
    VALUES
      (${adminId}, ${action}, ${entityType}, ${entityId}, ${JSON.stringify(oldValue)}, ${JSON.stringify(newValue)})
  `;
}
```

**Effort:** 3 hours  
**Result:** All admin actions logged with before/after values

---

#### **3.2 Revenue Analytics Dashboard**

**File:** `src/components/admin/revenue-analytics.tsx`

```typescript
"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function RevenueAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/admin/analytics/revenue")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <Loader />;

  return (
    <div className="space-y-6">
      {/* MRR Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40">
        <p className="text-gray-400 text-sm">Monthly Recurring Revenue</p>
        <p className="text-3xl font-bold text-green-400">${data.mrr.toLocaleString()}</p>
        <p className="text-green-500 text-sm mt-2">↑ {data.mrrGrowth}% this month</p>
      </div>

      {/* Revenue Trend */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40">
        <h3 className="text-lg font-bold text-white mb-4">Revenue Trend (Last 12 months)</h3>
        <LineChart data={data.monthlyRevenue} width={800} height={300}>
          <CartesianGrid />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#fbbf24" />
        </LineChart>
      </div>

      {/* Tier Breakdown */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40">
        <h3 className="text-lg font-bold text-white mb-4">Revenue by Tier</h3>
        <BarChart data={data.tierRevenue} width={800} height={300}>
          <CartesianGrid />
          <XAxis dataKey="tier" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#fbbf24" />
        </BarChart>
      </div>
    </div>
  );
}
```

**API:** `src/app/api/admin/analytics/revenue/route.ts`

```typescript
export async function GET() {
  // Get MRR
  const mrr = await db`
    SELECT SUM(price_usd) as total
    FROM user_subscriptions us
    JOIN subscription_tiers st ON us.tier_id = st.id
    WHERE us.status = 'active'
  `;

  // Get monthly breakdown
  const monthly = await db`
    SELECT
      DATE_TRUNC('month', created_at) as month,
      SUM(price_usd) as revenue
    FROM user_subscriptions us
    JOIN subscription_tiers st ON us.tier_id = st.id
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;

  // Get by tier
  const byTier = await db`
    SELECT
      st.name as tier,
      SUM(st.price_usd) as revenue,
      COUNT(*) as users
    FROM user_subscriptions us
    JOIN subscription_tiers st ON us.tier_id = st.id
    WHERE us.status = 'active'
    GROUP BY st.name
  `;

  return NextResponse.json({
    mrr: mrr[0].total || 0,
    monthlyRevenue: monthly,
    tierRevenue: byTier,
  });
}
```

**Effort:** 4 hours  
**Result:** Real-time revenue metrics visible to admin

---

### **PHASE 3 CHECKLIST**
- [ ] Audit log table created
- [ ] Audit API endpoint created
- [ ] Admin audit dashboard created
- [ ] Revenue analytics API created
- [ ] Revenue dashboard component created
- [ ] Add audit tab to admin
- [ ] Add analytics tab to admin
- [ ] Test with sample data

**COMPLETION TIME:** 1 week  
**DEPENDENCIES:** Phase 1 & 2 complete  
**NEXT:** Phase 4 (Email Notifications)

---

## 📧 PHASE 4: EMAIL NOTIFICATIONS (Week 3)

### **Objective:** Send emails for key events (payment, upgrade, etc.)

**File:** `src/lib/emails.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPaymentConfirmation(
  email: string,
  tier: string,
  amount: number
) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `Welcome to ${tier} tier!`,
    html: `
      <h1>Payment Received</h1>
      <p>Your payment of $${amount} has been confirmed.</p>
      <p>You now have access to all ${tier} features.</p>
    `,
  });
}

export async function sendUpgradeReminder(email: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'You could unlock more features',
    html: `...`,
  });
}
```

**Effort:** 3 hours  
**Result:** Automated emails trigger on payment, upgrade, cancellation

---

## 💬 PHASE 5: USER SUPPORT & HELP (Week 4)

### **Objective:** Help center, chat support, FAQs

**Add to frontend:**
- Help icon in header → knowledge base
- Live chat widget for paid users
- FAQ page
- Email support form

**Effort:** 4-5 hours

---

## 🧪 PHASE 6: TESTING & POLISH (Week 4-5)

### **Checklist**
- [ ] Load test with 1000 concurrent users
- [ ] Mobile responsiveness (iOS + Android)
- [ ] Payment flow (test + live)
- [ ] Email delivery
- [ ] Error handling
- [ ] Performance optimization
- [ ] Security audit
- [ ] Accessibility review

**Effort:** 10-15 hours

---

## 📱 PHASE 7: REACT NATIVE APK (Week 5+)

### **Only after web is production-ready**

- [ ] Set up React Native project
- [ ] Mirror web features
- [ ] Test on real devices
- [ ] Build APK + submit to Play Store

---

## 📈 PRIORITY MATRIX

```
           EFFORT (→ →)
         Low      Medium      High
I    │
M    │ Tier Cloning   Analytics   Payment WH
P    │                Audit Trail  Bulk Import
A    ├───────────────────────────────
C    │ Discount       Email        Email notif
T    │ Codes          Webhooks     API Keys
      
(↑ ↑)
```

**Do ASAP:** Payment WH, Frontend Gating, Audit Trail  
**Do Next:** Analytics, Email Notifications, Bulk Import  
**Do Later:** Discounts, Webhooks, Advanced features

---

## 🎯 WEEKLY BREAKDOWN

| Week | Phase | Focus | Status |
|------|-------|-------|--------|
| **Now** | ✅ Admin | Tier management + payment gateway | DONE |
| **1** | 🔄 Phase 1 | Payment integration (webhooks) | IN PROGRESS |
| **2** | 🔄 Phase 2 | Frontend tier awareness | NEXT |
| **2-3** | 🔄 Phase 3 | Audit + analytics | AFTER |
| **3** | 🔄 Phase 4 | Email notifications | AFTER |
| **4** | 🔄 Phase 5 | Testing + polish | AFTER |
| **5+** | 🔄 Phase 7 | APK launch | LATER |

---

## ✅ SUCCESS METRICS

By end of Phase 6:
- ✅ Users can pay for tiers
- ✅ Features gated by tier
- ✅ Admin can manage everything
- ✅ Revenue visible in dashboard
- ✅ Zero bugs in critical paths
- ✅ <2s page load time
- ✅ Mobile responsive
- ✅ 99% Stripe test success

---

**Ready to build Phase 1? Start here: /src/app/api/webhooks/stripe/route.ts** 🚀

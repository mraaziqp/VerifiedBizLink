# 🎯 IMMEDIATE NEXT TASKS - YOUR ROADMAP

**Exact steps to integrate everything and get the app fully functional**

---

## 📍 WHERE WE ARE

```
✅ COMPLETE:
  ├── Admin system (tier management)
  ├── Beautiful UI components
  ├── User dashboard
  ├── Ad creator (5 steps)
  ├── Account settings
  ├── Subscription manager
  └── Admin setup wizard

❌ MISSING:
  ├── API endpoints for ads
  ├── API endpoints for analytics
  ├── Stripe webhook integration
  ├── Dashboard data binding
  ├── Ad creation API
  ├── Update profile API
  └── Navigation integration
```

---

## 🔧 PHASE 1: WIRE UP DASHBOARD (1-2 Days)

### **Task 1.1: Create Ad API Endpoint**
**File:** `src/app/api/ads/create/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get("x-user-id");
    
    const { title, description, location, radius, duration, imageUrl } = body;

    // Validate input
    if (!title || !description || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check user's tier (free users limited to 3 ads)
    const subscription = await db`
      SELECT tier FROM user_subscriptions 
      WHERE user_id = ${userId} AND status = 'active'
    `;

    const tier = subscription[0]?.tier || 'Free';
    const adLimit = tier === 'Free' ? 3 : tier === 'Standard' ? 50 : 999;

    const adCount = await db`
      SELECT COUNT(*) FROM ads WHERE user_id = ${userId}
    `;

    if (adCount[0].count >= adLimit) {
      return NextResponse.json(
        { error: `${tier} tier limited to ${adLimit} ads` },
        { status: 403 }
      );
    }

    // Create ad
    const ad = await db`
      INSERT INTO ads
        (user_id, title, description, location, radius, duration, status)
      VALUES
        (${userId}, ${title}, ${description}, ${location}, ${radius}, ${duration}, 'active')
      RETURNING *
    `;

    return NextResponse.json(ad[0], { status: 201 });
  } catch (error) {
    console.error("Error creating ad:", error);
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
```

**Effort:** 1.5 hours  
**Test:** Create ad from ad-creator component

---

### **Task 1.2: Get User Analytics API**
**File:** `src/app/api/ads/analytics/route.ts`

```typescript
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");

    // Get total impressions this month
    const impressions = await db`
      SELECT SUM(impressions) as total
      FROM ad_metrics
      WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '30 days'
    `;

    // Get daily breakdown
    const daily = await db`
      SELECT
        DATE(created_at) as day,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions
      FROM ad_metrics
      WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    // Get active ads
    const activeAds = await db`
      SELECT COUNT(*) as count
      FROM ads
      WHERE user_id = ${userId} AND status = 'active'
    `;

    return NextResponse.json({
      totalImpressions: impressions[0]?.total || 0,
      daily: daily || [],
      activeAds: activeAds[0].count,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
```

**Effort:** 1 hour  
**Test:** Dashboard analytics load correctly

---

### **Task 1.3: Update User Profile API**
**File:** `src/app/api/user/settings/route.ts`

```typescript
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const body = await req.json();
    const { name, company, phone, notificationsEmail, notificationsSMS, newsletter } = body;

    const result = await db`
      UPDATE users
      SET
        name = ${name},
        company = ${company || null},
        phone = ${phone || null},
        notifications_email = ${notificationsEmail},
        notifications_sms = ${notificationsSMS},
        newsletter = ${newsletter},
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
```

**Effort:** 45 minutes  
**Test:** Save settings from account-settings component

---

### **Task 1.4: Link Dashboard to Orchestrator**
**File:** `src/app/admin/orchestrator/page.tsx` (update)

Add sidebar navigation:
```typescript
import AdminSidebar from "@/components/admin/admin-sidebar";

export default function OrchestratorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <AdminSidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
      <div className="ml-64">
        {/* All existing content here */}
      </div>
    </div>
  );
}
```

**Effort:** 30 minutes

---

## 🔧 PHASE 2: PAYMENT INTEGRATION (1-2 Days)

### **Task 2.1: Create Stripe Webhook**
**File:** `src/app/api/webhooks/stripe/route.ts`

```typescript
import { Stripe } from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!;

    // Verify webhook
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle payment success
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.user_id;
      const tierId = invoice.metadata?.tier_id;

      if (userId && tierId) {
        // Assign tier to user
        await db`
          INSERT INTO user_subscriptions (user_id, tier_id, status)
          VALUES (${userId}, ${tierId}, 'active')
          ON CONFLICT (user_id) DO UPDATE
          SET tier_id = ${tierId}, status = 'active'
        `;

        // Send confirmation email
        await sendEmail(userId, "Payment Confirmed!");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
```

**Effort:** 2 hours  
**Test:** Use Stripe test webhook to verify

---

### **Task 2.2: Create Checkout Session**
**File:** `src/app/api/checkout/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get("x-user-id");
    const { tier_name } = body;

    // Get tier details
    const tier = await db`
      SELECT * FROM subscription_tiers WHERE name = ${tier_name}
    `;

    if (!tier[0]) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tier_name} Subscription`,
            },
            unit_amount: Math.round(tier[0].price_usd * 100),
            recurring: {
              interval: tier[0].billing_interval as "month" | "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        user_id: userId,
        tier_id: tier[0].id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
```

**Effort:** 1.5 hours  
**Test:** Click upgrade button and test payment

---

## 🔧 PHASE 3: DATABASE UPDATES (Few hours)

### **Task 3.1: Create Ads Table**
```sql
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  radius INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_ads_user ON ads(user_id);
CREATE INDEX idx_ads_status ON ads(status);
```

---

### **Task 3.2: Create Ad Metrics Table**
```sql
CREATE TABLE ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL,
  user_id UUID NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ad FOREIGN KEY (ad_id) REFERENCES ads(id)
);

CREATE INDEX idx_metrics_user ON ad_metrics(user_id);
```

---

## 📊 TESTING CHECKLIST

```
PHASE 1: Dashboard Integration
☐ Ad creation API works
☐ Analytics API returns data
☐ User settings save
☐ Dashboard loads with real data
☐ Ad creator successfully creates ad
☐ Performance chart shows data

PHASE 2: Payment
☐ Stripe keys in .env
☐ Checkout session created
☐ Redirects to Stripe page
☐ Test payment succeeds
☐ Webhook fires
☐ User assigned tier
☐ Confirmation email sent

PHASE 3: End-to-End
☐ User signs up
☐ Free tier assigned
☐ Can create 3 ads
☐ Dashboard shows ads
☐ Can upgrade
☐ Can create unlimited ads after upgrade
☐ Analytics show real data
☐ Can manage account settings
```

---

## 📋 WORK BREAKDOWN

| Task | File | Effort | Status |
|------|------|--------|--------|
| Ad creation API | `api/ads/create` | 1.5h | ❌ TODO |
| Analytics API | `api/ads/analytics` | 1h | ❌ TODO |
| Settings API | `api/user/settings` | 45m | ❌ TODO |
| Sidebar integration | orchestrator page | 30m | ❌ TODO |
| Stripe webhook | `api/webhooks/stripe` | 2h | ❌ TODO |
| Checkout session | `api/checkout` | 1.5h | ❌ TODO |
| Database setup | migrations | 1h | ❌ TODO |
| Testing | all flows | 2h | ❌ TODO |

**Total:** ~10 hours

---

## ✅ SUCCESS CRITERIA

When complete, users should be able to:

```
✅ Sign up
✅ See beautiful dashboard
✅ Create ads in 2 minutes
✅ See ad analytics
✅ Manage account settings
✅ Upgrade to Premium
✅ Get unlimited ads after upgrade
✅ Manage subscription
✅ See revenue/performance
✅ Everything works on mobile
```

---

## 🚀 PRIORITY ORDER

**DO FIRST (Today):**
1. Ad creation API
2. Analytics API
3. Settings API

**DO NEXT (Tomorrow):**
4. Stripe webhook
5. Checkout session

**DO LAST (Optional, good to have):**
6. Database optimization
7. Email notifications

---

## 💡 TIPS

- Use existing `db` helper for queries
- Test each API separately before integrating
- Check `.env` for all required keys
- Use Stripe test mode first
- Don't forget to add API route handlers to middleware

---

**This roadmap will take 2-3 days to complete. After this, the app will be fully functional and production-ready! 🚀**

Start with Task 1.1 now?

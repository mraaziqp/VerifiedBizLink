# 🎯 BUSINESS NAME DISPLAY FIX

**Ensure business accounts show ONLY business name, not user name**

---

## 📋 REQUIREMENTS

### Rule: Business Account Display
```
IF account_type = "business":
  Display: businessName ONLY
  Hide: ownerName, userName, personalName
  
IF account_type = "customer":
  Display: customerName (user's personal name)
  Hide: businessName (if any)
```

### Current Issue
```
❌ Currently showing: "John Acme" AND "Acme Corp"
✅ Should show: "Acme Corp" ONLY (for business accounts)
✅ Should show: "John Acme" ONLY (for customer accounts)
```

---

## 🔍 AUDIT FINDINGS

### Components to Fix

#### 1. Business Profile Card
**Location:** `src/components/business-card.tsx` or similar
**Issue:** Showing both user name and business name
**Fix:** Add account type check
```tsx
// BEFORE
<div className="name">{user.name}</div>
<div className="business">{business.businessName}</div>

// AFTER
<div className="name">
  {user.accountType === "business" 
    ? business.businessName 
    : user.name}
</div>
```

#### 2. Posts/Feed Component
**Location:** `src/components/posts/*` or feed components
**Issue:** Posts showing author's personal name instead of business name
**Fix:** Use account type to determine display name
```tsx
const displayName = post.userAccountType === "business" 
  ? post.businessName 
  : post.userName;

<div className="author">{displayName}</div>
```

#### 3. Recommendations Feed
**Location:** `src/components/discover/smart-match-feed.tsx`
**Issue:** Recommendations might show user name
**Fix:** Ensure only business names display
```tsx
<h4 className="text-white font-bold">
  {recommendation.businessName}
</h4>
```

#### 4. Network/Connections
**Location:** `src/components/network/*`
**Issue:** Connection cards might show user names
**Fix:** Filter by account type
```tsx
const displayName = connection.accountType === "business"
  ? connection.businessName
  : connection.name;
```

#### 5. Admin User List
**Location:** `src/components/admin/user-subscription-manager.tsx`
**Issue:** Showing both user name and business name
**Fix:** Show appropriate name based on account type
```tsx
<td className="px-6 py-4 text-gray-300">
  {user.accountType === "business" ? user.business_name : user.name}
</td>
```

#### 6. Business Profile Page
**Location:** `src/app/business/[id]/page.tsx`
**Issue:** Profile header might show user name
**Fix:** Display only business name in header
```tsx
<h1 className="text-4xl font-bold text-white">
  {business.businessName}
</h1>
```

---

## 🔧 IMPLEMENTATION PLAN

### Step 1: Add Type to Database Schema
```sql
-- Ensure users table has account_type field
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'customer';
UPDATE users SET account_type = 'business' WHERE business_name IS NOT NULL;
```

### Step 2: Update TypeScript Types
```typescript
// In src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  accountType: "business" | "customer"; // ADD THIS
  businessName?: string;
  status: string;
  created_at: string;
}
```

### Step 3: Create Display Name Utility
```typescript
// In src/lib/display-helpers.ts
export function getDisplayName(
  user: User,
  business: Business | null
): string {
  if (user.accountType === "business") {
    return business?.businessName || user.businessName || "Unknown Business";
  }
  return user.name || "Unknown User";
}

// Usage in components:
const displayName = getDisplayName(user, business);
```

### Step 4: Fix All Components
Update each component to:
1. Import getDisplayName utility
2. Replace hardcoded name displays
3. Test on each page

### Step 5: Test All Pages
- [ ] Business profile pages
- [ ] Post/feed display
- [ ] Admin user management
- [ ] Network/connections
- [ ] Business cards/listings
- [ ] Recommendations
- [ ] Search results

---

## 📊 COMPONENTS TO UPDATE

### Priority 1: Critical User-Facing (Fix Today)
```
☐ src/components/business-card.tsx
☐ src/app/business/[id]/page.tsx
☐ src/components/posts/* (if exists)
☐ src/components/discover/smart-match-feed.tsx
```

### Priority 2: Admin & Secondary (Fix This Week)
```
☐ src/components/admin/user-subscription-manager.tsx
☐ src/components/network/* (if exists)
☐ Feed/timeline components
☐ Search result components
```

### Priority 3: Nice-to-Have
```
☐ Email templates
☐ Notifications
☐ Export files
☐ Reports
```

---

## 💡 KEY RULE

### Golden Rule
> **For any component that displays a user/account name in public view:**
> - IF it's a business account → Show ONLY business name
> - IF it's a customer account → Show ONLY customer name
> - NEVER show both on the same business

---

## ✅ VERIFICATION CHECKLIST

After fixes:
```
☐ Business profiles show ONLY business name
☐ Posts by businesses show business name (not owner)
☐ Recommendations show business names
☐ Admin user list shows correct names
☐ Network connections show correct names
☐ Search results show correct names
☐ No personal names visible on business accounts
☐ Customer accounts still show personal names
☐ No UI breakage from hidden names
☐ All pages tested on mobile/desktop
```

---

## 🚀 IMPLEMENTATION CODE

### Utility Function (Create New File)
**File:** `src/lib/display-helpers.ts`

```typescript
import type { User, Business } from "@/types";

/**
 * Get the display name for a user based on their account type
 * Business accounts show business name only
 * Customer accounts show personal name only
 */
export function getDisplayName(
  user: User,
  business?: Business | null
): string {
  // Business account - show ONLY business name
  if (user.accountType === "business") {
    return business?.businessName || user.businessName || "Unknown Business";
  }

  // Customer account - show ONLY personal name
  return user.name || "Unknown User";
}

/**
 * Get avatar initials from appropriate name
 */
export function getInitials(
  user: User,
  business?: Business | null
): string {
  const displayName = getDisplayName(user, business);
  return displayName.slice(0, 1).toUpperCase();
}

/**
 * Get contact person name (for business accounts, show owner)
 * Used in admin/internal views only
 */
export function getContactName(user: User): string {
  return user.name || "Unknown";
}

/**
 * Get full business info (for internal/admin only)
 */
export function getFullBusinessInfo(
  user: User,
  business?: Business | null
): { displayName: string; ownerName: string; businessName: string } {
  return {
    displayName: getDisplayName(user, business),
    ownerName: user.name,
    businessName: business?.businessName || user.businessName || "N/A",
  };
}
```

---

## 🎯 EXAMPLE FIXES

### Fix 1: Business Card Component
```tsx
// BEFORE
export function BusinessCard({ user, business }) {
  return (
    <div className="card">
      <h3>{user.name}</h3>  {/* ❌ Wrong - shows user name */}
      <p>{business.businessName}</p>
      <p className="secondary">{business.category}</p>
    </div>
  );
}

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

export function BusinessCard({ user, business }) {
  const displayName = getDisplayName(user, business);
  
  return (
    <div className="card">
      <h3>{displayName}</h3>  {/* ✅ Correct - shows only business name */}
      <p className="secondary">{business.category}</p>
    </div>
  );
}
```

### Fix 2: Post Author Display
```tsx
// BEFORE
function PostCard({ post, author }) {
  return (
    <div className="post">
      <div className="author">
        <strong>{author.name}</strong>  {/* ❌ Shows personal name */}
      </div>
      <p>{post.content}</p>
    </div>
  );
}

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

function PostCard({ post, author, authorBusiness }) {
  const displayName = getDisplayName(author, authorBusiness);
  
  return (
    <div className="post">
      <div className="author">
        <strong>{displayName}</strong>  {/* ✅ Shows business name for business accounts */}
      </div>
      <p>{post.content}</p>
    </div>
  );
}
```

### Fix 3: Admin User Table
```tsx
// BEFORE
<table>
  {users.map(user => (
    <tr>
      <td>{user.email}</td>
      <td>{user.name}</td>  {/* ❌ Shows user name */}
      <td>{user.business_name}</td>
    </tr>
  ))}
</table>

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

<table>
  {users.map(user => (
    <tr>
      <td>{user.email}</td>
      <td>{getDisplayName(user, { businessName: user.business_name })}</td> {/* ✅ Correct */}
    </tr>
  ))}
</table>
```

---

## 📈 IMPACT

### Before Fix
```
❌ "John Acme" (Acme Corp) - Confusing, shows personal name
❌ Business seems to belong to person, not be its own entity
❌ Privacy issue - personal names visible in public
```

### After Fix
```
✅ "Acme Corp" - Clear, professional
✅ Business is the entity, not the person
✅ Privacy-respecting - no personal names in public view
✅ Professional network feel
```

---

## ⏱️ ESTIMATED TIME

```
Create utility file:        30 minutes
Fix top 5 components:       2 hours
Fix remaining components:   1.5 hours
Testing:                    1 hour
────────────────────────
TOTAL:                      ~5 hours
```

---

## 🎯 SUCCESS CRITERIA

✅ All business accounts show ONLY business name in public  
✅ All customer accounts show ONLY personal name  
✅ No personal names visible on business profiles  
✅ Admin can still see owner info internally  
✅ All pages render correctly  
✅ Mobile responsive  
✅ Zero console errors  

---

**Priority:** HIGH - User-facing display logic  
**Impact:** Medium - Visual/UX fix  
**Effort:** Low-Medium - Systematic updates  
**Testing:** Full regression needed  


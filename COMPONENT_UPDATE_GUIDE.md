# 🔧 COMPONENT UPDATE GUIDE

**How to integrate the business name display fix into all components**

---

## 🚀 QUICK START

### 1. Import the utility in any component that displays names:
```tsx
import { getDisplayName } from "@/lib/display-helpers";
```

### 2. Use it instead of direct name display:
```tsx
// BEFORE: ❌ Shows personal name for business
const authorName = post.user.name;

// AFTER: ✅ Shows correct name based on account type
const authorName = getDisplayName(post.user, post.business);
```

### 3. Update wherever you show names:
- Business cards
- Post author displays
- Network connections
- Admin tables
- Search results
- Profile headers
- Feed items

---

## 📋 ALL COMPONENTS TO UPDATE

### HIGH PRIORITY (User-Facing)

#### 1. Business Card Component
**File:** `src/components/business-card.tsx` (or wherever business cards are)

```tsx
// BEFORE
export function BusinessCard({ business, user }) {
  return (
    <Card>
      <h3>{user.name}</h3>  {/* ❌ WRONG */}
      <p>{business.businessName}</p>
      <p className="secondary">{business.category}</p>
    </Card>
  );
}

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

export function BusinessCard({ business, user }) {
  const displayName = getDisplayName(user, business);
  
  return (
    <Card>
      <h3>{displayName}</h3>  {/* ✅ CORRECT */}
      <p className="secondary">{business.category}</p>
    </Card>
  );
}
```

#### 2. Post/Feed Component
**File:** `src/components/posts/*` or feed components

```tsx
// BEFORE
function PostItem({ post, author }) {
  return (
    <div className="post">
      <strong>{author.name}</strong>  {/* ❌ WRONG */}
      <p>{post.content}</p>
    </div>
  );
}

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

function PostItem({ post, author, authorBusiness }) {
  const displayName = getDisplayName(author, authorBusiness);
  
  return (
    <div className="post">
      <strong>{displayName}</strong>  {/* ✅ CORRECT */}
      <p>{post.content}</p>
    </div>
  );
}
```

#### 3. Smart Match Feed Component
**File:** `src/components/discover/smart-match-feed.tsx`

Already uses recommendations with businessName directly ✅ (Good!)

#### 4. User Profile Page Header
**File:** `src/app/business/[id]/page.tsx`

```tsx
// BEFORE
<h1>{business.ownerName || business.companyName}</h1>  {/* ❌ WRONG */}

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

const user = /* fetch user */;
<h1>{getDisplayName(user, business)}</h1>  {/* ✅ CORRECT */}
```

---

### MEDIUM PRIORITY (Admin & Internal)

#### 5. Admin User Management Table
**File:** `src/components/admin/user-subscription-manager.tsx`

```tsx
// BEFORE
<table>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <td>{user.email}</td>
        <td>{user.name}</td>  {/* ❌ WRONG */}
        <td>{user.business_name}</td>
      </tr>
    ))}
  </tbody>
</table>

// AFTER
import { getDisplayName } from "@/lib/display-helpers";

<table>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <td>{user.email}</td>
        <td>
          {getDisplayName(user, { businessName: user.business_name })}
        </td>  {/* ✅ CORRECT */}
      </tr>
    ))}
  </tbody>
</table>
```

#### 6. Network/Connections Component
**File:** `src/components/network/*` (if exists)

```tsx
import { getDisplayName } from "@/lib/display-helpers";

// Update all connection card displays
const displayName = getDisplayName(connection.user, connection.business);
```

#### 7. Search Results
**File:** `src/components/search/*` (if exists)

```tsx
import { getDisplayName } from "@/lib/display-helpers";

// Update all search result item displays
results.map(result => (
  <div key={result.id}>
    <h3>{getDisplayName(result.user, result.business)}</h3>
  </div>
))
```

---

### LOWER PRIORITY (Nice-to-Have)

#### 8. Email Templates
**Location:** Backend email template rendering

```
Template: business_joined_email.html
Change: "Welcome {{owner_name}}" → "Welcome to {{business_name}}"
```

#### 9. Notification Messages
**Location:** Notification generation functions

```
Before: "John added you as connection"
After: "Acme Corp added you as connection"
```

#### 10. Export/Reports
**Location:** CSV export, PDF reports functions

```
Before: CSV contains both owner name and business name
After: CSV contains only business name for business accounts
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Step 1: Check Each File
```
☐ src/components/business-card.tsx (or variant)
☐ src/components/posts/* 
☐ src/app/business/[id]/page.tsx
☐ src/components/admin/user-subscription-manager.tsx
☐ src/components/network/* (if exists)
☐ src/components/search/* (if exists)
☐ src/components/discover/* (verify no issues)
☐ src/components/layout/* (headers, nav)
```

### Step 2: Update Each File
For each file:
1. Add import: `import { getDisplayName } from "@/lib/display-helpers";`
2. Find all places showing `user.name` for business accounts
3. Replace with `getDisplayName(user, business)`
4. Test the component

### Step 3: Test
```
☐ Business card shows only business name
☐ Customer name shows for customer accounts
☐ Post authors show correctly
☐ Admin table shows correct names
☐ Network shows correct names
☐ Search results show correct names
☐ Mobile responsive
☐ No console errors
```

### Step 4: Commit
```bash
git add -A
git commit -m "fix: apply business name display rule to all components"
git push origin main
```

---

## 📊 EXAMPLE DIFF

### Before
```tsx
- <strong>{user.name}</strong>
- <p>Business: {business.businessName}</p>
+ {/* Shows: "John Acme" and "Acme Corp" - confusing! ❌ */}
```

### After
```tsx
+ import { getDisplayName } from "@/lib/display-helpers";
+ const displayName = getDisplayName(user, business);
+ <strong>{displayName}</strong>
+ {/* Shows: "Acme Corp" only for business accounts ✅ */}
```

---

## 🎯 HELPER FUNCTIONS REFERENCE

### getDisplayName(user, business?)
Returns the appropriate name to display publicly
```tsx
getDisplayName(user, business)
// Business account: returns "Acme Corp"
// Customer account: returns "John Acme"
```

### isBusinessAccount(user)
Check if this is a business account
```tsx
if (isBusinessAccount(user)) {
  // Show business-specific features
}
```

### getInitials(user, business?)
Get avatar initials
```tsx
const initials = getInitials(user, business);
// "A" for "Acme Corp" or "J" for "John Acme"
```

### getOwnerName(user)
Get owner name (internal only - NEVER show in public)
```tsx
// Only use in admin/internal views
const ownerEmail = `${getOwnerName(user)}@example.com`;
```

### formatProfileHeader(user, business?)
Format complete profile header with status
```tsx
const header = formatProfileHeader(user, business);
// "Acme Corp ✓ Verified" (if verified)
// "Acme Corp" (if not verified)
```

---

## ⚠️ IMPORTANT RULES

### DO
✅ Use `getDisplayName()` in all public displays  
✅ Pass both `user` and `business` objects  
✅ Use `getOwnerName()` only in admin views  
✅ Test on mobile after each change  

### DON'T
❌ Show `user.name` directly for business accounts  
❌ Show both business and personal name  
❌ Use `getOwnerName()` in public views  
❌ Hardcode "Acme Corp" - always derive from data  

---

## 🧪 TESTING TEMPLATE

For each component update, test:

```
Component: ________________
File: ________________

Test Cases:
☐ Business account displays business name only
☐ Customer account displays personal name only  
☐ No personal name visible on business accounts
☐ Responsive on mobile (390px)
☐ Responsive on tablet (768px)
☐ No console errors
☐ Avatar initials correct
☐ Profile header formatted correctly

Result: ☐ PASS ☐ FAIL
Notes: ________________
```

---

## ⏱️ TIME ESTIMATES

```
Per Component:           ~15-30 minutes
5 Priority 1 Components: ~2-2.5 hours
5 Priority 2 Components: ~1.5-2 hours
Testing:                 ~1-1.5 hours
─────────────────────────────
TOTAL:                   ~5-6 hours
```

---

## 📈 SUCCESS METRICS

After completing all updates:

```
✅ Zero instances of user.name on business profiles
✅ 100% of public displays use getDisplayName()
✅ All tests passing
✅ No console errors
✅ Mobile responsive verified
✅ Build succeeds with no warnings
✅ All business accounts show only business name
✅ All customer accounts show only personal name
```

---

## 🚀 READY TO IMPLEMENT?

1. Start with Priority 1 components
2. Follow this guide for each component
3. Test after each update
4. Commit when group of components complete
5. When all done, create final "fix: business name display" commit

---

**Status:** ✅ Utility functions created and tested  
**Next:** Implement across all components  
**Est. Time:** 5-6 hours total  
**Priority:** HIGH - User-facing logic fix  


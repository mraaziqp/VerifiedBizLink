# ⚠️ CRITICAL FIXES NEEDED - AUDIT REPORT

**Status:** Issues found that violate original requirements  
**Priority:** HIGH - Must fix before any deployment  
**Date:** 2026-06-08

---

## 🔴 CRITICAL ISSUES FOUND

### 1. Business Name Display Rule VIOLATED ❌
**Rule:** Business accounts show ONLY business name (not owner name)  
**Current Issue:** Shows "John Acme" instead of "Acme Corp Pty Ltd"  
**Impact:** All feed posts, profiles, recommendations showing wrong names  
**Files to Fix:**
- [ ] `src/components/feed/activity-feed.tsx` - Post author names
- [ ] `src/components/discover/smart-match-feed.tsx` - Recommendation names
- [ ] `src/components/business-card.tsx` (if exists) - Business cards
- [ ] Post/feed author display logic
- [ ] Connection/profile displays
- [ ] Admin dashboards showing business names

**Fix Required:** Add role/account-type check to ALL name displays
```tsx
const displayName = user.role === "business" 
  ? business.companyName 
  : user.fullName;
```

---

### 2. Fake Data / Placeholder Content ❌
**Issue:** News feed, posts, recommendations are all fake
**Current:** "View all recommendations", "John Acme posts" are placeholders  
**Required:** Real, functional, genuinely useful content
**Files Affected:**
- [ ] News feed (hard-coded fake items)
- [ ] Social posts (fake John Acme post)
- [ ] Recommendations (fake data)
- [ ] Analytics (mock numbers)

**Fix Required:** Replace with real data from database

---

### 3. Admin Settings Portal MISSING ❌
**Issue:** No comprehensive portal to see/manage all settings  
**Required:** Portal showing all settings for:
- [ ] User preferences (notifications, language, dark mode)
- [ ] Business settings (company info, verification status)
- [ ] Payment settings (subscription, billing history)
- [ ] Security settings (2FA, sessions, password)
- [ ] Privacy settings (data, POPI, deletion)
- [ ] Notification settings (email, push preferences)

**Files to Create:**
- [ ] `/app/settings/portal/page.tsx` - Main settings portal
- [ ] `/components/settings/settings-portal.tsx` - Portal component
- [ ] `/components/settings/*/` - Individual setting sections

---

### 4. Admin Dashboards Not Fully Upgraded ❌
**Issue:** Dashboards exist but lack:
- [ ] Role-based customization
- [ ] Real metrics and data
- [ ] Actionable insights
- [ ] Quick actions for common tasks
- [ ] Comprehensive reporting

**Files to Upgrade:**
- [ ] `/admin/orchestrator/page.tsx`
- [ ] `/admin/architect/page.tsx`
- [ ] `/admin/enforcer/page.tsx`
- [ ] Create unified admin dashboard with all tools

---

### 5. Client-Side Polish INCOMPLETE ❌
**Issues:**
- [ ] Feed data is fake/hard-coded
- [ ] Recommendations don't work
- [ ] News items are placeholders
- [ ] Some components missing real data
- [ ] Animations/transitions might be missing
- [ ] Mobile responsiveness gaps

---

## 📋 FIX EXECUTION PLAN

### Phase A: Critical (Do First - 2 hours)
1. **Fix Business Name Display** across ALL components
2. **Create Real News Feed System** with database data
3. **Replace Fake Data** with real database queries

### Phase B: Important (Do Second - 2 hours)
1. **Build Settings Portal** comprehensive
2. **Upgrade Admin Dashboards** with real data
3. **Add Admin Tools** for each role

### Phase C: Polish (Do Third - 1 hour)
1. **Client-side UI Polish**
2. **Mobile Responsiveness**
3. **Animation/Transitions**

---

## ✅ COMPLETION CHECKLIST

- [ ] Business name display fixed everywhere
- [ ] Real news feed from database
- [ ] All fake data replaced
- [ ] Settings portal fully functional
- [ ] Admin dashboards upgraded
- [ ] Client-side polished
- [ ] Build passes
- [ ] All tests pass
- [ ] Ready for deployment

---

## ESTIMATED TIME
- Total: 5 hours
- Can parallelize some work
- Need to test thoroughly

---

**NEXT STEP:** Start Phase A immediately

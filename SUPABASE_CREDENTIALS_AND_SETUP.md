# 🔐 SUPABASE CREDENTIALS & PROJECT SETUP

**Status:** Ready to use  
**Date:** 2026-06-10  

---

## 🔑 **YOUR SUPABASE PROJECT DETAILS**

### **Project URL (Use This)**
```
https://hllycop.supabase.co
```

### **API Keys**

**Anon Key (Public - Safe to expose):**
```
sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
```

**Service Role Key (Secret - Keep private):**
```
[Shown in your Supabase dashboard at Settings → API → Service Role]
Copy it from: https://supabase.com/dashboard/project/utcfjstmqwu1tmnxdyf/settings/api-keys
```

---

## ✅ **VERCEL ENVIRONMENT VARIABLES - FINAL LIST**

Copy these exactly to Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://hllycop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase dashboard]
RESEND_API_KEY=re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah
```

---

## 🪣 **SUPABASE BUCKETS TO CREATE**

Go to: `https://hllycop.supabase.co/dashboard/project/utcfjstmqwu1tmnxdyf/storage/buckets`

**Create 4 Buckets:**

1. **profile-pictures** (Private)
2. **business-images** (Private)
3. **post-media** (Public)
4. **vetting-documents** (Private)

---

## 📝 **SUPABASE CLIENT SETUP**

File: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hllycop.supabase.co';
const supabaseAnonKey = 'sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 🚀 **READY TO USE**

Everything is set up and ready!

Next: Create buckets → Update Vercel → Deploy

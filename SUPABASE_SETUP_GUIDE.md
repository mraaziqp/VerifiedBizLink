# Supabase Integration Setup Guide

## Your Supabase Project Details

**Project:** yxotoupitmeiuaabcdx  
**Region:** (Check Supabase dashboard)

---

## Environment Variables for Vercel/Production

Add these to your Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR-SUPABASE-KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR-SUPABASE-KEY>
```

---

## For Local Development (.env.local)

Add to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR-SUPABASE-KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR-SUPABASE-KEY>
```

---

## Setup Steps

### 1. Create Storage Buckets in Supabase

Go to: https://supabase.com/dashboard  
Project: yxotoupitmeiuaabcdx  
Storage section:

**Create bucket: `avatars`**
- Private or Public: Public (for avatar images)
- Folder path: `users/{user_id}/`

**Create bucket: `documents`**
- Private or Public: Private (for business documents)
- Folder path: `documents/{business_id}/`

---

### 2. Update Image Upload Code

For avatar uploads, use:
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`users/${userId}/${filename}`, file)
```

For document uploads, use:
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`documents/${businessId}/${filename}`, file)
```

---

### 3. Database Policies

In Supabase SQL editor, run:

```sql
-- Allow users to upload to their own avatar folder
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public to view avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
WHERE bucket_id = 'avatars';

-- Allow admins to access documents
CREATE POLICY "Admins can access documents"
ON storage.objects FOR SELECT
WHERE bucket_id = 'documents' AND (auth.jwt() ->> 'role') = 'admin';
```

---

## Testing Supabase Integration

1. **Test avatar upload:** Go to Settings → Upload Photo
2. **Test document upload:** Upload a business document
3. **Test retrieval:** Check if images display correctly

---

## Deployment Checklist

- [ ] Add Supabase keys to Vercel environment
- [ ] Deploy to production
- [ ] Test avatar upload in production
- [ ] Test document upload in production
- [ ] Verify all images load correctly
- [ ] Check storage bucket sizes

---

## Supabase Dashboard Links

- **Main Dashboard:** https://supabase.com/dashboard
- **Project:** yxotoupitmeiuaabcdx
- **Storage:** https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx/storage/buckets
- **SQL Editor:** https://supabase.com/dashboard/project/yxotoupitmeiuaabcdx/sql


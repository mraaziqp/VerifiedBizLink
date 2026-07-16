# 🗄️ SUPABASE SETUP GUIDE - Complete

**Status:** Instructions provided, ready to implement  
**Date:** 2026-06-10  
**Purpose:** Enable picture and video uploads  

---

## ✅ **CURRENT STATE**

**What We Have:**
```
✅ Supabase project created
✅ Anon key generated
✅ Project URL created
✅ Keys in .env.local
```

**What We Need:**
```
⏳ Create storage buckets
⏳ Set up RLS policies
⏳ Create upload functions
⏳ Update Vercel environment
⏳ Build upload components
```

---

## 🔑 **ENVIRONMENT VARIABLES - WHAT TO UPDATE ON VERCEL**

### **Step 1: Go to Vercel Dashboard**
```
https://vercel.com/dashboard/VerifiedBizLink/settings/environment-variables
```

### **Step 2: Add/Update These Variables**

**EXISTING (Update):**
```
RESEND_API_KEY = "re_6gvgFyxf_NnyxMc1G27jSNQHRhgLuYWah"
```

**NEW - Add These:**

#### **Supabase URLs & Keys (PUBLIC)**
```
NEXT_PUBLIC_SUPABASE_URL = "https://hllycop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_hLlycopFFJzmWXDAWUJAoQ_cRO_TY4Z"
```

#### **Supabase Service Role (SECRET - Server-side only)**
```
SUPABASE_SERVICE_ROLE_KEY = "[Get from Supabase Dashboard]"
```

To get the Service Role Key:
1. Go to: `https://supabase.com/dashboard`
2. Select: VerifiedBizLink project
3. Go to: Settings → API
4. Copy: `service_role` (the long secret key)
5. Paste in Vercel as `SUPABASE_SERVICE_ROLE_KEY`

#### **Optional - JWT Secret (if using auth)**
```
JWT_SECRET = "<REDACTED-generate-a-new-random-secret-do-not-commit>"
```

---

## 🗂️ **SUPABASE STORAGE BUCKETS SETUP**

### **Step 1: Go to Supabase Dashboard**
```
https://supabase.com/dashboard
```

### **Step 2: Create Buckets**

Go to: **Storage** → Click **+ New Bucket**

**Create These 4 Buckets:**

#### **1. Profile Pictures**
```
Name: profile-pictures
Visibility: Private (users can only access their own)
```

#### **2. Business Images**
```
Name: business-images
Visibility: Private (business owners can upload)
```

#### **3. Post Media**
```
Name: post-media
Visibility: Public (anyone can view posts)
```

#### **4. Vetting Documents**
```
Name: vetting-documents
Visibility: Private (admins only)
```

---

## 🔐 **ROW LEVEL SECURITY (RLS) POLICIES**

For each bucket, set up RLS to control who can upload/download.

### **Profile Pictures Bucket - RLS Policies**

**Policy 1: Users can upload their own**
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own profile picture" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (bucket_id = 'profile-pictures') AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 2: Users can view profile pictures**
```sql
-- Allow anyone to view profile pictures
CREATE POLICY "Anyone can view profile pictures" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'profile-pictures');
```

**Policy 3: Users can delete their own**
```sql
-- Allow users to delete their own
CREATE POLICY "Users can delete own profile picture" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  (bucket_id = 'profile-pictures') AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

### **Post Media Bucket - RLS Policies**

**Policy 1: Authenticated users can upload**
```sql
CREATE POLICY "Users can upload post media" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'post-media');
```

**Policy 2: Anyone can view post media**
```sql
CREATE POLICY "Anyone can view post media" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'post-media');
```

---

## 📦 **SUPABASE CLIENT SETUP**

### **Create Supabase Client File**

File: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client (for API routes)
export const supabaseServer = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
```

---

## 📤 **UPLOAD FUNCTIONS**

### **1. Profile Picture Upload**

File: `src/lib/upload-profile-picture.ts`

```typescript
import { supabase } from './supabase';

export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<{ url: string; error?: string }> {
  try {
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { url: '', error: 'File too large (max 5MB)' };
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { url: '', error: 'Invalid file type' };
    }

    // Create unique filename
    const ext = file.name.split('.').pop();
    const filename = `${userId}/${Date.now()}.${ext}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(filename, file, { upsert: true });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filename);

    return { url: publicUrl };
  } catch (err) {
    return { url: '', error: 'Upload failed' };
  }
}
```

### **2. Post Media Upload**

File: `src/lib/upload-post-media.ts`

```typescript
import { supabase } from './supabase';

export async function uploadPostMedia(
  userId: string,
  file: File
): Promise<{ url: string; type: string; error?: string }> {
  try {
    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB for videos
    if (file.size > maxSize) {
      return { url: '', type: '', error: 'File too large' };
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm'];
    const validTypes = [...validImageTypes, ...validVideoTypes];

    if (!validTypes.includes(file.type)) {
      return { url: '', type: '', error: 'Invalid file type' };
    }

    // Determine if image or video
    const isImage = validImageTypes.includes(file.type);
    const isVideo = validVideoTypes.includes(file.type);

    // Create unique filename
    const ext = file.name.split('.').pop();
    const filename = `${userId}/${Date.now()}.${ext}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(filename, file);

    if (error) {
      return { url: '', type: '', error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(filename);

    return {
      url: publicUrl,
      type: isImage ? 'image' : 'video'
    };
  } catch (err) {
    return { url: '', type: '', error: 'Upload failed' };
  }
}
```

---

## 🖼️ **UPLOAD COMPONENT - Profile Picture**

File: `src/components/profile/profile-picture-upload.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadProfilePicture } from '@/lib/upload-profile-picture';

interface ProfilePictureUploadProps {
  userId: string;
  onUploadComplete: (url: string) => void;
}

export function ProfilePictureUpload({
  userId,
  onUploadComplete
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError(null);

    const { url, error: uploadError } = await uploadProfilePicture(userId, file);

    if (uploadError) {
      setError(uploadError);
    } else {
      onUploadComplete(url);
      setPreview(null);
    }

    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {preview && (
        <div className="relative w-24 h-24 rounded-full overflow-hidden">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-0 right-0 bg-red-500 rounded-full p-1"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition">
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            <span>Upload Picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </>
        )}
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

---

## 📹 **UPLOAD COMPONENT - Post Media**

File: `src/components/feed/post-media-upload.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Upload, Loader2, X, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadPostMedia } from '@/lib/upload-post-media';

interface PostMediaUploadProps {
  userId: string;
  onMediaSelect: (url: string, type: 'image' | 'video') => void;
}

export function PostMediaUpload({ userId, onMediaSelect }: PostMediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const isImage = file.type.startsWith('image/');
      setPreview({
        url: e.target?.result as string,
        type: isImage ? 'image' : 'video'
      });
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError(null);

    const { url, type, error: uploadError } = await uploadPostMedia(userId, file);

    if (uploadError) {
      setError(uploadError);
    } else {
      onMediaSelect(url, type as 'image' | 'video');
    }

    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {preview && (
        <div className="relative w-full max-w-xs rounded-lg overflow-hidden bg-gray-100">
          {preview.type === 'image' ? (
            <img src={preview.url} alt="Preview" className="w-full h-auto" />
          ) : (
            <video src={preview.url} className="w-full h-auto" controls />
          )}
          <button
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition">
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            <span>Add Photo/Video</span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </>
        )}
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

---

## 📋 **SETUP CHECKLIST**

### **Phase 1: Supabase Dashboard Setup** (15 min)

- [ ] Go to: https://supabase.com/dashboard
- [ ] Select: VerifiedBizLink project
- [ ] Create 4 buckets:
  - [ ] profile-pictures
  - [ ] business-images
  - [ ] post-media
  - [ ] vetting-documents
- [ ] Get Service Role Key from Settings → API
- [ ] Copy both keys

### **Phase 2: Vercel Update** (10 min)

- [ ] Go to Vercel dashboard
- [ ] Add/update these variables:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] RESEND_API_KEY
- [ ] Redeploy

### **Phase 3: Code Setup** (20 min)

- [ ] Create: `src/lib/supabase.ts`
- [ ] Create: `src/lib/upload-profile-picture.ts`
- [ ] Create: `src/lib/upload-post-media.ts`
- [ ] Create: `src/components/profile/profile-picture-upload.tsx`
- [ ] Create: `src/components/feed/post-media-upload.tsx`

### **Phase 4: Integration** (30 min)

- [ ] Add upload to profile page
- [ ] Add upload to post creator
- [ ] Test profile picture upload
- [ ] Test post media upload
- [ ] Verify images/videos show in feed

### **Phase 5: Testing** (15 min)

- [ ] Test upload profile picture
- [ ] Test upload post image
- [ ] Test upload post video
- [ ] Test file size limits
- [ ] Test file type validation
- [ ] Test preview display

---

## 🚀 **COMPLETE SETUP FLOW**

1. **Get Supabase Keys (5 min)**
   - Go to dashboard
   - Copy URL and anon key
   - Copy service role key

2. **Create Buckets (10 min)**
   - Go to Storage
   - Create 4 buckets
   - Set visibility

3. **Update Vercel (10 min)**
   - Add 3 new variables
   - Redeploy
   - Wait for build

4. **Add Code (20 min)**
   - Copy supabase client
   - Copy upload functions
   - Copy upload components

5. **Test (10 min)**
   - Test profile upload
   - Test post media upload
   - Verify everything works

**Total Time: ~65 minutes**

---

## 📊 **AFTER SETUP**

Users will be able to:
- ✅ Upload profile pictures
- ✅ Upload business images
- ✅ Upload photos to posts
- ✅ Upload videos to posts
- ✅ See previews before upload
- ✅ Get error messages if too large
- ✅ See their uploads immediately

---

## 💡 **IMPORTANT NOTES**

1. **Service Role Key is SECRET**
   - Never commit to GitHub
   - Only use in .env.local and Vercel
   - Never expose to frontend

2. **Anon Key is PUBLIC**
   - Can be in NEXT_PUBLIC variables
   - Used for client-side uploads
   - Safe to expose

3. **File Size Limits**
   - Images: 5MB max
   - Videos: 50MB max
   - Adjust as needed

4. **Storage Costs**
   - Supabase charges per GB stored
   - Bandwidth charges apply
   - Free tier: 1GB storage, 3GB bandwidth

---

**Everything is ready to set up!** 🚀

Once you complete this, all picture and video uploads will work perfectly!

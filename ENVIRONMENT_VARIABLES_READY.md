# Environment Variables - Ready to Copy/Paste

## For Vercel Production Deployment

Copy and paste these into Vercel Environment Variables (Settings → Environment Variables)

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg
```

### Database (if using external Postgres)

```
DATABASE_URL=your_postgres_url_here
```

### Authentication

```
NEXTAUTH_SECRET=generate_a_random_secret_string_here
NEXTAUTH_URL=https://yourdomain.com
```

### Email Service (Resend)

```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za
```

### App URLs

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## For Local Development (.env.local)

Create/update your `.env.local` file with:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yxotoupitmeiuaabcdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTgzMjAsImV4cCI6MjA5NjA3NDMyMH0.1cmH9N0_wsI8wyVgIRu5yYDtqFJstXwZeymqPrLRHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4b3RvdXBpdG1pZXVpYWFiY2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ5ODMyMCwiZXhwIjoyMDk2MDc0MzIwfQ.SUbx_yWE0LCt5zODzThnQmCIfRyhYKr4QRrVLbiHqWg

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@verifiedbizlink.co.za

# Database (if external)
DATABASE_URL=your_postgres_url

# Auth
NEXTAUTH_SECRET=dev-secret-for-local-only
NEXTAUTH_URL=http://localhost:9002
```

---

## Steps to Deploy to Vercel

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Select Project:** VerifiedBizLink

3. **Go to Settings → Environment Variables**

4. **Add each variable** from the "Supabase Configuration" section above

5. **Redeploy**
   - Go to Deployments
   - Click "Redeploy" on latest deployment

6. **Test in Production**
   - Visit your Vercel URL
   - Test login and features

---

## Supabase Project Info

- **Project ID:** yxotoupitmeiuaabcdx
- **Supabase URL:** https://yxotoupitmeiuaabcdx.supabase.co
- **Dashboard:** https://supabase.com/dashboard

---

## Next Steps (After Demo)

1. ✅ Set up Supabase buckets (avatars, documents)
2. ✅ Add environment variables to Vercel
3. ✅ Deploy to production
4. ✅ Test avatar uploads work
5. ✅ Test document uploads work
6. ✅ Enable image optimization

---

**All keys are ready to use. No additional setup needed beyond adding these variables.**

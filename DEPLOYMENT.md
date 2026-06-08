# VerifiedBizLink - Production Deployment Guide

## Quick Start - Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account with VerifiedBizLink repository
- Vercel account (free tier available)
- Production database (Neon PostgreSQL already set up)
- All environment variables ready

### Deployment Steps

#### 1. Connect to Vercel
```bash
# Login to Vercel (one-time setup)
npm install -g vercel
vercel login
```

#### 2. Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or authorize from Vercel dashboard:
# 1. Go to vercel.com
# 2. Click "Import Project"
# 3. Select GitHub repository
# 4. Configure environment variables
# 5. Click "Deploy"
```

#### 3. Set Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
DATABASE_URL = [Your Neon PostgreSQL URL]
JWT_SECRET = [Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NEXT_PUBLIC_APP_URL = https://www.verifiedbizlink.co.za
GOOGLE_API_KEY = [Your Gemini API key]
RESEND_API_KEY = [Your Resend API key]
STRIPE_SECRET_KEY = [Your Stripe key, if using payments]
SETUP_SECRET = [Generate: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"]
```

#### 4. Verify Deployment
- Check Vercel Dashboard for build logs
- Visit https://your-project.vercel.app
- Test signup/login flow
- Test AI chat
- Verify database connectivity

---

## Domain Setup

### Point Custom Domain to Vercel

1. **Update DNS Records**
   - Go to your domain registrar
   - Add CNAME record: `www.verifiedbizlink.co.za` → `cname.vercel-dns.com`
   - Add A record for root domain if needed

2. **Configure in Vercel**
   - Dashboard → Project Settings → Domains
   - Add `verifiedbizlink.co.za`
   - Add `www.verifiedbizlink.co.za`
   - Vercel will verify DNS

3. **Enable HTTPS**
   - Automatic via Let's Encrypt
   - Vercel handles certificate management

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run (`/api/setup` endpoint)
- [ ] Email verification working
- [ ] AI chat enabled with API key
- [ ] HTTPS enabled
- [ ] Custom domain pointing correctly
- [ ] Monitoring set up (Vercel analytics)
- [ ] Backup strategy in place
- [ ] Error logging configured
- [ ] Performance monitoring active

---

## Database Setup in Production

### Run Migrations on Production Database

```bash
# Call setup endpoint with production secret
curl -X POST https://www.verifiedbizlink.co.za/api/setup \
  -H "x-setup-secret: YOUR_SETUP_SECRET"

# Run migrations
curl -X POST https://www.verifiedbizlink.co.za/api/setup/migrate \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

---

## Monitoring & Maintenance

### Vercel Analytics
- View in Vercel Dashboard
- Track response times
- Monitor error rates
- Check database query performance

### Database Backups
- Neon provides automatic backups
- Configure retention period
- Test restore procedure

### Security
- Keep environment variables secure
- Rotate secrets periodically
- Monitor suspicious activity
- Enable rate limiting

---

## Rollback Procedure

If deployment has issues:

```bash
# Rollback to previous version
vercel rollback

# Or redeploy specific commit
vercel --prod --force
```

---

## Support & Troubleshooting

### Common Issues

**Build Fails**
- Check Node.js version
- Verify all dependencies installed
- Check environment variables

**Database Connection Error**
- Verify DATABASE_URL is correct
- Check IP whitelist in Neon
- Ensure migrations ran

**AI Chat Not Working**
- Verify GOOGLE_API_KEY set
- Check API quota
- Test with simple prompt

**Email Not Sending**
- Verify RESEND_API_KEY
- Check sender domain verified
- Review email logs

---

## Performance Optimization

### Built-in Optimizations
- Image optimization via Next.js Image component
- Code splitting & lazy loading
- Edge caching with Vercel CDN
- Automatic compression

### Additional Steps
- Monitor Core Web Vitals
- Optimize database queries
- Configure Redis caching (optional)
- Enable compression in next.config.js

---

## After Deployment

1. **Test Core Flows**
   - User signup/login
   - Business verification
   - Payment processing
   - AI chat

2. **Monitor Performance**
   - Check Vercel Dashboard daily
   - Monitor error rates
   - Track user metrics

3. **Keep Updated**
   - Regular backups
   - Security patches
   - Dependency updates
   - Feature deployments

---

## Deployment Complete! 🎉

Your app is now live in production. Monitor it closely in the first week and iterate based on user feedback.

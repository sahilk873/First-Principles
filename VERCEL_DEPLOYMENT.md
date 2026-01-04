# Vercel Deployment Guide

This document provides instructions for deploying the First Principles application to Vercel.

## Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project configured with all migrations applied
- Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables

Configure the following environment variables in your Vercel project settings:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings → Environment Variables**
3. Add the following variables:

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
- Go to your Supabase Dashboard
- Navigate to **Settings → API**
- Copy the **Project URL** → Use as `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public** key → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional Environment Variables

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Warning:** The service role key should only be used for admin scripts and never exposed in client-side code. It's only needed if you plan to run admin scripts on Vercel (which is not typical).

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect your repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will auto-detect Next.js

2. **Configure project settings:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: Leave as default (usually `/`)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: Leave as default (`.next`)
   - Install Command: `npm install` (auto-detected)

3. **Add environment variables:**
   - In the project settings, add the environment variables listed above
   - Apply to: **Production**, **Preview**, and **Development**

4. **Deploy:**
   - Click **Deploy**
   - Vercel will build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Add environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Post-Deployment Checklist

After deployment, verify the following:

- [ ] Application loads without errors
- [ ] Login functionality works
- [ ] Users can access protected routes (dashboard, cases, reviews)
- [ ] Database connections are working (check browser console)
- [ ] Images from Supabase storage load correctly
- [ ] All environment variables are set correctly

## Troubleshooting

### Build Failures

If the build fails:

1. **Check build logs** in Vercel Dashboard → Deployments → [Deployment] → Build Logs
2. **Verify environment variables** are set correctly
3. **Check Node.js version** - Vercel should use Node.js 18+ (configure in project settings if needed)

### Runtime Errors

If the application runs but has errors:

1. **Check function logs** in Vercel Dashboard → Deployments → [Deployment] → Functions
2. **Verify Supabase connection** - Check that environment variables are correct
3. **Check middleware** - Ensure protected routes are working correctly

### Image Loading Issues

If images don't load:

1. **Verify Supabase storage bucket** is configured correctly
2. **Check CORS settings** in Supabase Storage settings
3. **Verify image URLs** are being generated correctly

### Authentication Issues

If authentication doesn't work:

1. **Check Supabase Auth settings** - Ensure email provider is enabled
2. **Verify redirect URLs** - Add your Vercel domain to Supabase Auth → URL Configuration
3. **Check middleware** - Ensure session handling is correct

## Vercel Configuration

The `vercel.json` file in the project root is configured with:
- Build command: `npm run build`
- Framework: Next.js
- Region: `iad1` (US East)

You can modify these settings in the Vercel Dashboard if needed.

## Custom Domain

To add a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Follow the DNS configuration instructions
4. Update Supabase Auth redirect URLs to include your custom domain

## Performance Optimization

The application is configured for optimal performance on Vercel:

- **Edge Runtime:** Middleware runs on the Edge Network
- **Image Optimization:** Next.js Image component configured for external domains
- **Static Generation:** Landing page and login page are statically generated
- **Server Components:** All routes use React Server Components for optimal performance

## Support

For issues related to:
- **Vercel deployment:** Check [Vercel Documentation](https://vercel.com/docs)
- **Supabase:** Check [Supabase Documentation](https://supabase.com/docs)
- **Next.js:** Check [Next.js Documentation](https://nextjs.org/docs)


# Vercel Pre-Production Setup Guide

This guide explains how to set up Vercel pre-production environments for the AXIO GPT application.

## 🚀 Quick Setup

### Option 1: Preview Deployments (Automatic)
Every pull request automatically gets a preview URL.

### Option 2: Staging Branch (Recommended)
Dedicated staging branch for pre-production testing.

## 📋 Step-by-Step Setup

### 1. Create Staging Branch
```bash
# Run the setup script
./scripts/setup-staging.sh

# Or manually:
git checkout -b staging
git push -u origin staging
```

### 2. Configure Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `axio-gpt`
3. **Go to Settings → Git**
4. **Configure branches**:
   - ✅ Production Branch: `main`
   - ✅ Preview Branch: `staging`
   - ✅ All other branches: Enable previews

### 3. Set Up Environment Variables

#### For Staging Environment:
1. **Go to Settings → Environment Variables**
2. **Add variables for `staging` environment**:
   ```
   OPENAI_API_KEY=your_openai_api_key
   NEXTAUTH_SECRET=your_nextauth_secret
   DATABASE_URL=your_database_url
   ```

#### For Preview Deployments:
- Same variables will be inherited from staging

## 🌐 Deployment URLs

| Environment | Branch | URL |
|-------------|--------|-----|
| **Production** | `main` | `https://axio-gpt.vercel.app` |
| **Staging** | `staging` | `https://axio-gpt-staging.vercel.app` |
| **Preview** | Any branch | `https://axio-gpt-[branch]-[hash].vercel.app` |

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature
git push -u origin feature/new-feature
# → Gets automatic preview URL
```

### 2. Pre-Production Testing
```bash
# Merge to staging for testing
git checkout staging
git merge feature/new-feature
git push origin staging
# → Deploys to staging environment
```

### 3. Production Deployment
```bash
# Merge to main for production
git checkout main
git merge staging
git push origin main
# → Deploys to production
```

## 🛠️ Vercel CLI Commands

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link project to Vercel
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --target staging
```

## 📊 Environment Configuration

### Production (`main`)
- Full functionality
- Production database
- Production API keys
- Analytics enabled

### Staging (`staging`)
- Full functionality
- Staging database (or same as production)
- Same API keys as production
- Analytics enabled

### Preview (any branch)
- Full functionality
- Inherits environment variables
- Temporary URLs
- Great for testing PRs

## 🔧 Advanced Configuration

### Custom Domains
Add custom domains in Vercel Dashboard:
- Production: `axio-gpt.com`
- Staging: `staging.axio-gpt.com`

### Environment-Specific Settings
```javascript
// In your code
const isStaging = process.env.VERCEL_GIT_COMMIT_REF === 'staging';
const isProduction = process.env.VERCEL_GIT_COMMIT_REF === 'main';

if (isStaging) {
  // Staging-specific configuration
  console.log('Running in staging mode');
}
```

## 🚨 Important Notes

### Database Considerations
- **Option 1**: Use same database for staging and production
- **Option 2**: Create separate staging database
- **Option 3**: Use database branching (if supported)

### API Keys
- Same keys can be used for staging and production
- Or create separate keys for staging environment

### File Uploads
- Vercel has file system limitations
- Consider using external storage (S3, Cloudinary) for uploads

## 🐛 Troubleshooting

### Build Failures
- Check environment variables are set correctly
- Verify all dependencies are in `package.json`
- Check build logs in Vercel Dashboard

### Environment Variables Not Loading
- Ensure variables are set for correct environment
- Check variable names match exactly
- Redeploy after adding new variables

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure database is accessible from staging environment

## 📈 Monitoring

### Vercel Analytics
- Automatic performance monitoring
- Real user monitoring
- Core Web Vitals tracking

### Logs
- Function logs in Vercel Dashboard
- Real-time logs during development
- Error tracking and debugging

## 🎯 Best Practices

1. **Always test on staging first**
2. **Use preview deployments for PRs**
3. **Keep environment variables in sync**
4. **Monitor performance across environments**
5. **Use feature flags for gradual rollouts**

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Git Integration](https://vercel.com/docs/concepts/git)
- [Preview Deployments](https://vercel.com/docs/concepts/deployments/preview-deployments)

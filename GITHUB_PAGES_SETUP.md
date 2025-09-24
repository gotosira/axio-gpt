# GitHub Pages Pre-Production Setup

This document explains how to set up GitHub Pages as a pre-production environment for the AXIO GPT application.

## 🚀 Quick Setup

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the settings

### 2. Add Required Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

```
OPENAI_API_KEY=your_openai_api_key
NEXTAUTH_SECRET=your_nextauth_secret
DATABASE_URL=your_database_url
```

### 3. Deploy

The GitHub Actions workflow will automatically deploy when you push to `main` branch.

## 📁 Project Structure

```
├── .github/workflows/
│   └── deploy-github-pages.yml    # GitHub Actions workflow
├── next.config.js                 # Configured for GitHub Pages
├── package.json                   # Contains GitHub Pages scripts
└── out/                          # Generated static files (auto-created)
```

## 🔧 Configuration

### Next.js Configuration

The `next.config.js` is already configured for GitHub Pages:

```javascript
const isGhPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'axio-gpt';

const nextConfig = {
  ...(isGhPages ? {
    output: 'export',
    trailingSlash: true,
    assetPrefix: `/${repoName}/`,
    basePath: `/${repoName}`,
  } : {}),
  images: {
    ...(isGhPages ? { unoptimized: true } : {}),
  },
};
```

### Build Scripts

```bash
# Build for GitHub Pages
npm run build:gh-pages

# Deploy manually to GitHub Pages
npm run deploy:gh-pages
```

## 🌐 URLs

- **GitHub Pages (Pre-Production)**: `https://gotosira.github.io/axio-gpt/`
- **Vercel (Production)**: `https://axio-gpt.vercel.app/`

## 🔄 Workflow

1. **Development**: Make changes locally
2. **Pre-Production**: Push to `main` → Auto-deploy to GitHub Pages
3. **Production**: When ready → Deploy to Vercel

## 📝 Notes

- GitHub Pages requires static files (no server-side rendering)
- API routes won't work on GitHub Pages (they're server-side)
- Use GitHub Pages for testing UI changes and static features
- Use Vercel for full functionality including API routes

## 🛠️ Troubleshooting

### Build Fails
- Check that all environment variables are set in GitHub Secrets
- Ensure `GITHUB_PAGES=true` is set during build

### Assets Not Loading
- Verify `basePath` and `assetPrefix` are correctly set
- Check that `trailingSlash: true` is enabled

### API Routes Not Working
- Remember: API routes don't work on GitHub Pages (static hosting)
- Test API functionality on Vercel instead

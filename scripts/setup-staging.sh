#!/bin/bash

# Setup staging branch for Vercel pre-production
echo "🚀 Setting up Vercel staging environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create staging branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/staging; then
    echo "📝 Creating staging branch..."
    git checkout -b staging
    git push -u origin staging
else
    echo "✅ Staging branch already exists"
    git checkout staging
fi

echo ""
echo "🎯 Vercel Pre-Production Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Find your project: axio-gpt"
echo "3. Go to Settings → Git"
echo "4. Enable 'Production Branch': main"
echo "5. Enable 'Preview Branch': staging"
echo "6. Add environment variables for staging:"
echo "   - OPENAI_API_KEY"
echo "   - NEXTAUTH_SECRET"
echo "   - DATABASE_URL"
echo ""
echo "🌐 Your URLs will be:"
echo "   Production:  https://axio-gpt.vercel.app"
echo "   Staging:     https://axio-gpt-staging.vercel.app"
echo "   Preview:     https://axio-gpt-[branch]-[hash].vercel.app"
echo ""
echo "🔄 Workflow:"
echo "   1. Develop on feature branches"
echo "   2. Test on staging branch (pre-production)"
echo "   3. Merge to main (production)"
echo ""
echo "✨ To deploy to staging:"
echo "   git checkout staging"
echo "   git merge main"
echo "   git push origin staging"

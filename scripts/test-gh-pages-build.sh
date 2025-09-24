#!/bin/bash

# Test GitHub Pages build locally
echo "🧪 Testing GitHub Pages build locally..."

# Set environment variables for GitHub Pages
export GITHUB_PAGES=true
export NEXT_PUBLIC_APP_URL=https://gotosira.github.io/axio-gpt

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next out

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build for GitHub Pages
echo "🔨 Building for GitHub Pages..."
npm run build:gh-pages

# Check if build was successful
if [ -d "out" ]; then
    echo "✅ Build successful! Static files generated in ./out"
    echo "📁 Files in ./out:"
    ls -la out/
    
    echo ""
    echo "🌐 To test locally:"
    echo "   cd out && python3 -m http.server 8000"
    echo "   Then open: http://localhost:8000/axio-gpt/"
else
    echo "❌ Build failed! No ./out directory found."
    exit 1
fi

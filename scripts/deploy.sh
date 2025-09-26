#!/bin/bash

# Text4Quiz Deployment Script
# This script prepares and deploys the application

set -e  # Exit on any error

echo "🚀 Starting Text4Quiz deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run TypeScript checks
echo "🔍 Running TypeScript checks..."
npm run check

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✅ Build completed successfully!"
echo ""
echo "🎯 Next steps for Render deployment:"
echo "1. Create a new Web Service on Render"
echo "2. Connect your GitHub repository"
echo "3. Set build command: npm ci && npm run build"
echo "4. Set start command: npm start"
echo "5. Add environment variables from .env.example"
echo "6. Create PostgreSQL database and connect it"
echo ""
echo "📋 Don't forget to:"
echo "   - Export your current database data"
echo "   - Import data to new Render PostgreSQL"
echo "   - Test SMS delivery with real credentials"
echo ""
echo "🎉 Ready for deployment!"
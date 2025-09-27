#!/bin/bash

# Build verification script for Render deployment

echo "🔍 Build Verification Script"
echo "============================"

echo "📋 Environment Information:"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Directory contents:"
ls -la

echo ""
echo "📦 Package.json check:"
if [ -f package.json ]; then
    echo "✅ package.json exists"
    echo "🔍 Build script:"
    cat package.json | grep -A1 -B1 '"build"'
else
    echo "❌ package.json not found!"
    exit 1
fi

echo ""
echo "🏗️  Build artifacts check:"
if [ -d dist ]; then
    echo "✅ dist/ directory exists"
    echo "📁 Contents:"
    ls -la dist/
    
    if [ -f dist/index.js ]; then
        echo "✅ Backend built: dist/index.js"
        echo "📊 Size: $(du -h dist/index.js | cut -f1)"
    else
        echo "❌ Backend build missing: dist/index.js"
    fi
    
    if [ -d dist/public ]; then
        echo "✅ Frontend built: dist/public/"
        echo "📊 Contents:"
        ls -la dist/public/
    else
        echo "❌ Frontend build missing: dist/public/"
    fi
else
    echo "❌ dist/ directory not found"
fi

echo ""
echo "🎯 Verification complete!"
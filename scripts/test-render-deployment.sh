#!/bin/bash

# Text4Quiz Render Deployment Test Script

echo "🧪 Testing Render Deployment"
echo "============================"

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Render app URL"
    echo "   Usage: $0 <your-app-url>"
    echo "   Example: $0 https://text4quiz.onrender.com"
    exit 1
fi

RENDER_URL="$1"
echo "📡 Testing: $RENDER_URL"

# Test 1: Health Check
echo ""
echo "🔍 Test 1: Health Check Endpoint"
echo "================================"
health_response=$(curl -s -w "%{http_code}" "$RENDER_URL/api/health" -o /tmp/health_response.json)
health_code="${health_response: -3}"

if [ "$health_code" = "200" ]; then
    echo "✅ Health check passed (Status: $health_code)"
    echo "📋 Response:"
    cat /tmp/health_response.json | jq . 2>/dev/null || cat /tmp/health_response.json
else
    echo "❌ Health check failed (Status: $health_code)"
    echo "📋 Response:"
    cat /tmp/health_response.json
fi

# Test 2: Frontend Loading
echo ""
echo "🔍 Test 2: Frontend Loading"
echo "==========================="
frontend_response=$(curl -s -w "%{http_code}" "$RENDER_URL" -o /dev/null)
frontend_code="${frontend_response: -3}"

if [ "$frontend_code" = "200" ]; then
    echo "✅ Frontend loads successfully (Status: $frontend_code)"
else
    echo "❌ Frontend failed to load (Status: $frontend_code)"
fi

# Test 3: API Endpoints
echo ""
echo "🔍 Test 3: API Endpoints"
echo "========================"

# Test auth status endpoint
auth_response=$(curl -s -w "%{http_code}" "$RENDER_URL/api/auth/status" -o /tmp/auth_response.json)
auth_code="${auth_response: -3}"

if [ "$auth_code" = "200" ]; then
    echo "✅ Auth endpoint works (Status: $auth_code)"
else
    echo "❌ Auth endpoint failed (Status: $auth_code)"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "Health Check: $([ "$health_code" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "Frontend: $([ "$frontend_code" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "API Endpoints: $([ "$auth_code" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"

if [ "$health_code" = "200" ] && [ "$frontend_code" = "200" ] && [ "$auth_code" = "200" ]; then
    echo ""
    echo "🎉 All tests passed! Your app is running correctly on Render."
    echo "🔗 Access your app: $RENDER_URL"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Test user signup with a real phone number"
    echo "2. Verify SMS welcome message"
    echo "3. Test admin login"
    echo "4. Import your database data"
else
    echo ""
    echo "⚠️  Some tests failed. Check the Render logs for details:"
    echo "   - Go to Render Dashboard → Your Service → Logs"
    echo "   - Look for startup errors or runtime issues"
fi

# Cleanup
rm -f /tmp/health_response.json /tmp/auth_response.json
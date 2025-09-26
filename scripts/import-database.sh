#!/bin/bash

# Text4Quiz Database Import Script for Render
# This script imports your exported database to Render PostgreSQL

set -e  # Exit on any error

echo "📥 Text4Quiz Database Import Script"
echo "===================================="

# Check if NEW_DATABASE_URL is set
if [ -z "$NEW_DATABASE_URL" ]; then
    echo "❌ Error: NEW_DATABASE_URL environment variable is not set"
    echo "   Please set your new Render database URL:"
    echo "   export NEW_DATABASE_URL='your_render_database_url'"
    exit 1
fi

# Check if export file is provided
if [ -z "$1" ]; then
    echo "❌ Error: No export file specified"
    echo "   Usage: $0 <export_file.sql>"
    echo "   Example: $0 database_exports/text4quiz_export_20250926_183000.sql"
    exit 1
fi

EXPORT_FILE="$1"

# Check if export file exists
if [ ! -f "$EXPORT_FILE" ]; then
    echo "❌ Error: Export file '$EXPORT_FILE' not found"
    exit 1
fi

echo "📋 New Render database: $NEW_DATABASE_URL"
echo "📄 Import file: $EXPORT_FILE"
echo "📊 File size: $(du -h "$EXPORT_FILE" | cut -f1)"

# Confirm before proceeding
echo ""
echo "⚠️  WARNING: This will replace ALL data in the target database!"
echo "   Make sure you're importing to the correct database."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Import cancelled"
    exit 1
fi

# Import the database
echo "🔄 Starting database import..."

if command -v psql >/dev/null 2>&1; then
    echo "📦 Importing to Render PostgreSQL..."
    
    # First, create the schema with our current structure
    echo "🏗️  Setting up database schema..."
    npm run db:push --force || echo "⚠️ Schema push failed, continuing with import..."
    
    # Import the data
    echo "📥 Importing data..."
    psql "$NEW_DATABASE_URL" -f "$EXPORT_FILE" -v ON_ERROR_STOP=1
    
    echo "✅ Database import completed!"
    
    # Verify the import
    echo "🔍 Verifying import..."
    USERS_COUNT=$(psql "$NEW_DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" | xargs)
    QUESTIONS_COUNT=$(psql "$NEW_DATABASE_URL" -t -c "SELECT COUNT(*) FROM questions;" | xargs)
    ANSWERS_COUNT=$(psql "$NEW_DATABASE_URL" -t -c "SELECT COUNT(*) FROM user_answers;" | xargs)
    
    echo "📊 Import verification:"
    echo "   👥 Users: $USERS_COUNT"
    echo "   ❓ Questions: $QUESTIONS_COUNT"  
    echo "   ✅ Answers: $ANSWERS_COUNT"
    
else
    echo "❌ Error: psql not found"
    echo "   Please install PostgreSQL client tools:"
    echo "   macOS: brew install postgresql"
    echo "   Linux: sudo apt-get install postgresql-client"
    exit 1
fi

echo ""
echo "🎉 Database migration to Render completed!"
echo "🔗 Your new database is ready at Render"
echo ""
echo "🎯 Next steps:"
echo "1. Update your Render app environment variables"
echo "2. Deploy your application"
echo "3. Test SMS functionality"
echo ""
echo "🚀 Migration successful!"
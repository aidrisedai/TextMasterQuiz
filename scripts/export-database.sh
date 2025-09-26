#!/bin/bash

# Text4Quiz Database Export Script
# This script exports your current database for migration to Render

set -e  # Exit on any error

echo "🗄️  Text4Quiz Database Export Script"
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "   Please set your current database URL:"
    echo "   export DATABASE_URL='your_current_database_url'"
    exit 1
fi

# Extract database info
echo "📋 Current database: $DATABASE_URL"

# Create exports directory
EXPORT_DIR="./database_exports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_FILE="${EXPORT_DIR}/text4quiz_export_${TIMESTAMP}.sql"

mkdir -p "$EXPORT_DIR"

echo "📦 Exporting database to: $EXPORT_FILE"

# Export the database
echo "🔄 Running pg_dump..."
if command -v pg_dump >/dev/null 2>&1; then
    pg_dump "$DATABASE_URL" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --verbose \
        > "$EXPORT_FILE"
    
    echo "✅ Database export completed!"
    echo "📄 Export file: $EXPORT_FILE"
    echo "📊 File size: $(du -h "$EXPORT_FILE" | cut -f1)"
    
    # Create a data-only export as backup
    DATA_EXPORT_FILE="${EXPORT_DIR}/text4quiz_data_${TIMESTAMP}.sql"
    echo "📦 Creating data-only export: $DATA_EXPORT_FILE"
    
    pg_dump "$DATABASE_URL" \
        --data-only \
        --no-owner \
        --no-privileges \
        --verbose \
        > "$DATA_EXPORT_FILE"
    
    echo "✅ Data-only export completed!"
    echo "📄 Data file: $DATA_EXPORT_FILE"
    echo "📊 File size: $(du -h "$DATA_EXPORT_FILE" | cut -f1)"
    
else
    echo "❌ Error: pg_dump not found"
    echo "   Please install PostgreSQL client tools:"
    echo "   macOS: brew install postgresql"
    echo "   Linux: sudo apt-get install postgresql-client"
    exit 1
fi

# Show export summary
echo ""
echo "📋 Export Summary:"
echo "=================="
echo "📁 Export directory: $EXPORT_DIR"
echo "📄 Full export: $EXPORT_FILE"
echo "📄 Data only: $DATA_EXPORT_FILE"
echo ""
echo "🎯 Next steps:"
echo "1. Create PostgreSQL database on Render"
echo "2. Import the full export file to new database"
echo "3. Test the migration"
echo ""
echo "🚀 Ready for Render migration!"
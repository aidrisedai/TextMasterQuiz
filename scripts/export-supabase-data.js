#!/usr/bin/env node

// Text4Quiz Supabase Data Export Script
// This script exports data from Supabase using the REST API (when direct PostgreSQL access isn't available)

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://lvdkhidegzrobvjryqxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGtoaWRlZ3pyb2J2anJ5cXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjM4MTAsImV4cCI6MjA2ODY5OTgxMH0.VXztGOSDVA5IDEM9ArT-ABaZIMaod5PVtY39-BqCFKg';

console.log('🗄️  Text4Quiz Supabase Data Export');
console.log('====================================');

// Table names to export
const tables = [
    'users',
    'questions', 
    'user_answers',
    'admin_users',
    'delivery_queue',
    'broadcasts',
    'broadcast_deliveries',
    'generation_jobs'
];

async function fetchTable(tableName) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
    
    try {
        console.log(`📦 Fetching ${tableName}...`);
        
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log(`⚠️  Table ${tableName} not found or empty (${response.status})`);
            return [];
        }
        
        const data = await response.json();
        console.log(`✅ ${tableName}: ${data.length} records`);
        return data;
        
    } catch (error) {
        console.log(`❌ Error fetching ${tableName}:`, error.message);
        return [];
    }
}

function generateSQL(tableName, data) {
    if (!data || data.length === 0) {
        return `-- No data for table ${tableName}\n\n`;
    }
    
    let sql = `-- Data for table ${tableName}\n`;
    
    // Get column names from first record
    const columns = Object.keys(data[0]);
    
    for (const row of data) {
        const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) {
                return 'NULL';
            }
            if (typeof val === 'string') {
                return `'${val.replace(/'/g, "''")}'`;
            }
            if (typeof val === 'boolean') {
                return val ? 'true' : 'false';
            }
            if (Array.isArray(val)) {
                return `'{${val.map(v => `"${v}"`).join(',')}}'`;
            }
            if (val instanceof Date || typeof val === 'string' && val.includes('T')) {
                return `'${val}'`;
            }
            return val;
        });
        
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    sql += '\n';
    return sql;
}

async function exportData() {
    const exportDir = './database_exports';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const exportFile = path.join(exportDir, `supabase_export_${timestamp}.sql`);
    const jsonFile = path.join(exportDir, `supabase_export_${timestamp}.json`);
    
    // Create export directory
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const exportData = {};
    let totalRecords = 0;
    let sqlContent = '-- Text4Quiz Supabase Data Export\n';
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += '-- Source: Supabase API\n\n';
    
    // Export each table
    for (const tableName of tables) {
        const data = await fetchTable(tableName);
        exportData[tableName] = data;
        totalRecords += data.length;
        
        // Generate SQL INSERT statements
        sqlContent += generateSQL(tableName, data);
    }
    
    // Write SQL file
    fs.writeFileSync(exportFile, sqlContent);
    
    // Write JSON file as backup
    fs.writeFileSync(jsonFile, JSON.stringify(exportData, null, 2));
    
    console.log('\n📋 Export Summary:');
    console.log('==================');
    console.log(`📁 Export directory: ${exportDir}`);
    console.log(`📄 SQL export: ${exportFile}`);
    console.log(`📄 JSON backup: ${jsonFile}`);
    console.log(`📊 Total records: ${totalRecords}`);
    
    // Show breakdown by table
    console.log('\n📊 Records per table:');
    for (const tableName of tables) {
        const count = exportData[tableName].length;
        if (count > 0) {
            console.log(`   ${tableName}: ${count} records`);
        }
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Create PostgreSQL database on Render');
    console.log('2. Run schema setup: npm run db:push');
    console.log(`3. Import data: psql $NEW_DATABASE_URL -f ${exportFile}`);
    console.log('\n🚀 Ready for Render migration!');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ Error: This script requires Node.js 18+ or you can install node-fetch');
    console.log('   Try: npm install node-fetch');
    process.exit(1);
}

// Run the export
exportData().catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
});
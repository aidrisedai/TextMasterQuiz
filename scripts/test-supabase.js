#!/usr/bin/env node

// Simple Supabase connectivity test

const SUPABASE_URL = 'https://lvdkhidegzrobvjryqxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGtoaWRlZ3pyb2J2anJ5cXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjM4MTAsImV4cCI6MjA2ODY5OTgxMH0.VXztGOSDVA5IDEM9ArT-ABaZIMaod5PVtY39-BqCFKg';

console.log('🔗 Testing Supabase connectivity...');
console.log(`📡 URL: ${SUPABASE_URL}`);

async function testConnection() {
    try {
        // Test basic API endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            console.log('✅ Connection successful!');
        } else {
            console.log('❌ Connection failed');
            const text = await response.text();
            console.log('Response:', text);
        }
        
    } catch (error) {
        console.log('❌ Connection error:', error.message);
    }
}

// Also test a specific table
async function testTable() {
    try {
        console.log('\n🔍 Testing table access...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📊 Users table status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Users table accessible, found ${data.length} records`);
            if (data.length > 0) {
                console.log('📋 Sample record columns:', Object.keys(data[0]));
            }
        } else {
            console.log('❌ Users table not accessible');
            const text = await response.text();
            console.log('Error response:', text);
        }
        
    } catch (error) {
        console.log('❌ Table test error:', error.message);
    }
}

testConnection().then(() => testTable());
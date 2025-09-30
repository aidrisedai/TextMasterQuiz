#!/usr/bin/env node

/**
 * Interactive database URL tester
 * Usage: node scripts/test-db-url.js "your-database-url"
 */

import pg from 'pg';

const { Pool } = pg;

async function testDatabaseUrl(url) {
  if (!url) {
    console.error('❌ Please provide a database URL as an argument');
    console.log('Usage: node scripts/test-db-url.js "postgresql://user:pass@host/db"');
    process.exit(1);
  }
  
  console.log('🔍 Testing database URL...');
  console.log('📍 Host:', url.split('@')[1]?.split('/')[0] || 'unknown');
  
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('render.com') || url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });
  
  try {
    console.log('🔌 Connecting...');
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT NOW() as server_time, version();');
      console.log('✅ Connection successful!');
      console.log('⏰ Server time:', result.rows[0].server_time);
      console.log('🐘 Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
      
      // Quick table check
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      
      if (tables.rows.length > 0) {
        console.log('📋 Existing tables:', tables.rows.map(r => r.table_name).join(', '));
      } else {
        console.log('📋 No tables found - database is empty');
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔍 Error code:', error.code || 'unknown');
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Suggestion: Check if the hostname is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Database server may be down or not accepting connections');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Suggestion: Network timeout - check connectivity or increase timeout');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Suggestion: Check username/password credentials');
    }
  } finally {
    await pool.end();
  }
}

// Get URL from command line argument
const databaseUrl = process.argv[2];
testDatabaseUrl(databaseUrl);
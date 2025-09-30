#!/usr/bin/env node

/**
 * Test database connection for Render deployment
 * This script tests the DATABASE_URL connection string
 */

import pg from 'pg';

const { Pool } = pg;

async function testRenderDatabase() {
  console.log('🔍 Testing Render database connection...');
  
  // Use the same DATABASE_URL format as your deployment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('📍 Database URL format check:', databaseUrl.substring(0, 20) + '...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
  
  try {
    console.log('🔌 Attempting to connect...');
    const client = await pool.connect();
    
    try {
      // Test basic connectivity
      const result = await client.query('SELECT NOW(), version();');
      console.log('✅ Database connected successfully!');
      console.log('📊 Server time:', result.rows[0].now);
      console.log('🐘 PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
      
      // Check if users table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ Users table exists');
        
        // Check table structure
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position;
        `);
        
        console.log('📋 Users table structure:');
        columns.rows.forEach(col => {
          console.log(`   ${col.column_name} (${col.data_type})`);
        });
        
        // Check user count
        const userCount = await client.query('SELECT COUNT(*) FROM users;');
        console.log(`👥 Total users in database: ${userCount.rows[0].count}`);
        
        // Test leaderboard query
        const leaderboard = await client.query(`
          SELECT phone_number, total_score, current_streak, correct_answers, questions_answered
          FROM users 
          ORDER BY total_score DESC 
          LIMIT 3;
        `);
        
        console.log('🏆 Sample leaderboard data:');
        leaderboard.rows.forEach((user, index) => {
          const maskedPhone = user.phone_number.replace(/(\\d{3})(\\d{3})(\\d{4})/, '$1-***-$4');
          console.log(`   ${index + 1}. ${maskedPhone} - Score: ${user.total_score}, Streak: ${user.current_streak}`);
        });
        
      } else {
        console.log('❌ Users table does not exist - database needs initialization');
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.name === 'ConnectionError' || error.code === 'ENOTFOUND') {
      console.error('   This suggests a network connectivity issue or incorrect host.');
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('   This suggests the database server is not running or not accepting connections.');
    }
    if (error.name === 'Error' && error.message.includes('timeout')) {
      console.error('   This suggests the database is unreachable or overloaded.');
    }
  } finally {
    await pool.end();
  }
}

testRenderDatabase().then(() => process.exit(0));
#!/usr/bin/env node

/**
 * Direct migration script for adding streak columns
 * Connects directly to PostgreSQL without requiring compiled code
 */

import pg from 'pg';

const { Pool } = pg;

async function directMigration() {
  console.log('🚀 Running direct dual streak migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    const client = await pool.connect();
    
    try {
      // Add play_streak column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS play_streak INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✅ play_streak column added/verified');
      } catch (error) {
        console.log('ℹ️  play_streak column operation result:', error.message);
      }
      
      // Add winning_streak column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS winning_streak INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✅ winning_streak column added/verified');
      } catch (error) {
        console.log('ℹ️  winning_streak column operation result:', error.message);
      }
      
      // Initialize dual streaks from current_streak for users with 0 values
      const result = await client.query(`
        UPDATE users 
        SET 
          play_streak = COALESCE(current_streak, 0),
          winning_streak = COALESCE(current_streak, 0)
        WHERE 
          (play_streak = 0 AND COALESCE(current_streak, 0) > 0) OR 
          (winning_streak = 0 AND COALESCE(current_streak, 0) > 0);
      `);
      
      console.log(`✅ Initialized dual streaks for ${result.rowCount || 0} users`);
      
      // Verify results
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN play_streak > 0 THEN 1 END) as users_with_play_streak,
          COUNT(CASE WHEN winning_streak > 0 THEN 1 END) as users_with_winning_streak,
          MAX(play_streak) as max_play_streak,
          MAX(winning_streak) as max_winning_streak
        FROM users;
      `);
      
      const userStats = stats.rows[0];
      console.log(`📊 Migration Results:`);
      console.log(`   Total users: ${userStats.total_users}`);
      console.log(`   Users with play streaks: ${userStats.users_with_play_streak}`);
      console.log(`   Users with winning streaks: ${userStats.users_with_winning_streak}`);
      console.log(`   Max play streak: ${userStats.max_play_streak}`);
      console.log(`   Max winning streak: ${userStats.max_winning_streak}`);
      
      console.log('✅ Direct migration completed successfully!');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

directMigration().then(() => process.exit(0));
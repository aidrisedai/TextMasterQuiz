#!/usr/bin/env node

/**
 * Simple migration script for Render deployment
 * Adds play_streak and winning_streak columns if they don't exist
 */

import { db } from '../server/db.js';

async function simpleMigration() {
  console.log('🚀 Running simple dual streak migration...');
  
  try {
    const { pool } = await import('../server/db.js');
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
        console.log('ℹ️  play_streak column may already exist');
      }
      
      // Add winning_streak column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS winning_streak INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✅ winning_streak column added/verified');
      } catch (error) {
        console.log('ℹ️  winning_streak column may already exist');
      }
      
      // Initialize dual streaks from current_streak for users with 0 values
      const result = await client.query(`
        UPDATE users 
        SET 
          play_streak = current_streak,
          winning_streak = current_streak
        WHERE 
          (play_streak = 0 AND current_streak > 0) OR 
          (winning_streak = 0 AND current_streak > 0);
      `);
      
      console.log(`✅ Initialized dual streaks for ${result.rowCount || 0} users`);
      
      // Verify results
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN play_streak > 0 THEN 1 END) as users_with_play_streak,
          COUNT(CASE WHEN winning_streak > 0 THEN 1 END) as users_with_winning_streak
        FROM users;
      `);
      
      const userStats = stats.rows[0];
      console.log(`📊 Migration Results:`);
      console.log(`   Total users: ${userStats.total_users}`);
      console.log(`   Users with play streaks: ${userStats.users_with_play_streak}`);
      console.log(`   Users with winning streaks: ${userStats.users_with_winning_streak}`);
      
      console.log('✅ Simple migration completed successfully!');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

simpleMigration().then(() => process.exit(0));
#!/usr/bin/env node

/**
 * Migration script to add dual streak columns to existing users
 * 
 * This script:
 * 1. Adds play_streak and winning_streak columns to users table
 * 2. Initializes play_streak = current_streak for existing users
 * 3. Sets winning_streak = current_streak for existing users  
 * 4. Provides backup/rollback functionality
 */

import { storage } from '../server/storage.js';
import { db } from '../server/db.js';

async function runMigration() {
  console.log('🚀 Starting dual streak migration...');
  
  try {
    // Step 1: Check if columns already exist
    console.log('📋 Checking current database schema...');
    const { pool } = await import('../server/db.js');
    const client = await pool.connect();
    
    try {
      // Check if new columns exist
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name IN ('play_streak', 'winning_streak')
        ORDER BY column_name;
      `);
      
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      console.log(`📊 Existing dual streak columns: ${existingColumns.join(', ') || 'none'}`);
      
      // Step 2: Add columns if they don't exist
      if (!existingColumns.includes('play_streak')) {
        console.log('➕ Adding play_streak column...');
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN play_streak INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✅ play_streak column added');
      } else {
        console.log('✅ play_streak column already exists');
      }
      
      if (!existingColumns.includes('winning_streak')) {
        console.log('➕ Adding winning_streak column...');
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN winning_streak INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✅ winning_streak column added');
      } else {
        console.log('✅ winning_streak column already exists');
      }
      
      // Step 3: Get all users that need migration
      console.log('👥 Fetching users for migration...');
      const users = await client.query(`
        SELECT id, phone_number, current_streak, play_streak, winning_streak
        FROM users 
        ORDER BY id;
      `);
      
      console.log(`📊 Found ${users.rows.length} users to migrate`);
      
      if (users.rows.length === 0) {
        console.log('✅ No users found - migration complete');
        return;
      }
      
      // Step 4: Initialize dual streaks for users with unset values
      let migrated = 0;
      let skipped = 0;
      
      for (const user of users.rows) {
        const needsPlayStreakUpdate = user.play_streak === 0 && user.current_streak > 0;
        const needsWinningStreakUpdate = user.winning_streak === 0 && user.current_streak > 0;
        
        if (needsPlayStreakUpdate || needsWinningStreakUpdate) {
          console.log(`🔄 Migrating user ${user.phone_number}: current_streak=${user.current_streak}`);
          
          const updates = [];
          const values = [];
          let paramCount = 1;
          
          if (needsPlayStreakUpdate) {
            updates.push(`play_streak = $${paramCount++}`);
            values.push(user.current_streak);
          }
          
          if (needsWinningStreakUpdate) {
            updates.push(`winning_streak = $${paramCount++}`);
            values.push(user.current_streak);
          }
          
          values.push(user.id);
          
          await client.query(`
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount};
          `, values);
          
          migrated++;
          console.log(`✅ Migrated ${user.phone_number}: play_streak=${user.current_streak}, winning_streak=${user.current_streak}`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped ${user.phone_number}: already has dual streaks (play=${user.play_streak}, winning=${user.winning_streak})`);
        }
      }
      
      // Step 5: Verify migration results
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Users migrated: ${migrated}`);
      console.log(`⏭️  Users skipped: ${skipped}`);
      console.log(`📈 Total users: ${users.rows.length}`);
      
      // Step 6: Verify data consistency
      console.log('\n🔍 Verifying migration results...');
      const verification = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN play_streak > 0 THEN 1 END) as users_with_play_streak,
          COUNT(CASE WHEN winning_streak > 0 THEN 1 END) as users_with_winning_streak,
          AVG(play_streak) as avg_play_streak,
          AVG(winning_streak) as avg_winning_streak,
          MAX(play_streak) as max_play_streak,
          MAX(winning_streak) as max_winning_streak
        FROM users;
      `);
      
      const stats = verification.rows[0];
      console.log(`📊 Total users: ${stats.total_users}`);
      console.log(`🎯 Users with play streaks: ${stats.users_with_play_streak}`);
      console.log(`🔥 Users with winning streaks: ${stats.users_with_winning_streak}`);
      console.log(`📈 Average play streak: ${parseFloat(stats.avg_play_streak || 0).toFixed(2)}`);
      console.log(`📈 Average winning streak: ${parseFloat(stats.avg_winning_streak || 0).toFixed(2)}`);
      console.log(`🏆 Max play streak: ${stats.max_play_streak || 0}`);
      console.log(`🏆 Max winning streak: ${stats.max_winning_streak || 0}`);
      
      console.log('\n✅ Dual streak migration completed successfully!');
      console.log('\n🎉 Benefits of the new system:');
      console.log('• Play Streak: Continues as long as you play daily (encourages participation)');
      console.log('• Winning Streak: Resets on wrong answers (rewards accuracy)'); 
      console.log('• Wrong answers now give 10 points instead of 0');
      console.log('• Correct answers give 100 base points + winning streak bonus');
      console.log('• More nuanced and engaging streak system');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check database connection');
    console.error('2. Verify DATABASE_URL is correct');
    console.error('3. Ensure database schema exists');
    console.error('4. Check user permissions');
    throw error;
  }
}

// Add rollback functionality
async function rollback() {
  console.log('🔄 Starting rollback of dual streak migration...');
  
  try {
    const { pool } = await import('../server/db.js');
    const client = await pool.connect();
    
    try {
      // Check which columns exist before rollback
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name IN ('play_streak', 'winning_streak')
        ORDER BY column_name;
      `);
      
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      
      if (existingColumns.includes('play_streak')) {
        console.log('🗑️  Dropping play_streak column...');
        await client.query('ALTER TABLE users DROP COLUMN play_streak;');
        console.log('✅ play_streak column dropped');
      }
      
      if (existingColumns.includes('winning_streak')) {
        console.log('🗑️  Dropping winning_streak column...');
        await client.query('ALTER TABLE users DROP COLUMN winning_streak;');
        console.log('✅ winning_streak column dropped');
      }
      
      if (existingColumns.length === 0) {
        console.log('ℹ️  No dual streak columns found to rollback');
      }
      
      console.log('✅ Rollback completed successfully');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'rollback') {
  rollback().catch(error => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
} else {
  runMigration().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
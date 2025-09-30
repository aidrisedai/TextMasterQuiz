#!/usr/bin/env node

/**
 * Test leaderboard endpoints by directly importing storage functions
 */

import * as dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function testLeaderboardQueries() {
  console.log('🏆 Testing leaderboard queries...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    try {
      // Test total score leaderboard
      console.log('\n📊 Testing Total Score Leaderboard...');
      const totalScoreQuery = `
        SELECT 
          phone_number, 
          total_score, 
          current_streak,
          correct_answers,
          questions_answered,
          join_date
        FROM users 
        WHERE is_active = true
        ORDER BY total_score DESC, current_streak DESC
        LIMIT 5;
      `;
      
      const totalScoreResult = await client.query(totalScoreQuery);
      console.log(`✅ Found ${totalScoreResult.rows.length} users for total score leaderboard`);
      totalScoreResult.rows.forEach((user, index) => {
        const maskedPhone = user.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
        console.log(`   ${index + 1}. ${maskedPhone} - Score: ${user.total_score}, Streak: ${user.current_streak}`);
      });

      // Test play streak leaderboard  
      console.log('\n🎯 Testing Play Streak Leaderboard...');
      const playStreakQuery = `
        SELECT 
          phone_number,
          play_streak,
          total_score,
          correct_answers,
          questions_answered,
          join_date
        FROM users 
        WHERE is_active = true
        ORDER BY play_streak DESC, total_score DESC
        LIMIT 5;
      `;
      
      const playStreakResult = await client.query(playStreakQuery);
      console.log(`✅ Found ${playStreakResult.rows.length} users for play streak leaderboard`);
      playStreakResult.rows.forEach((user, index) => {
        const maskedPhone = user.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
        console.log(`   ${index + 1}. ${maskedPhone} - Play Streak: ${user.play_streak}, Score: ${user.total_score}`);
      });

      // Test winning streak leaderboard
      console.log('\n🔥 Testing Winning Streak Leaderboard...');
      const winningStreakQuery = `
        SELECT 
          phone_number,
          winning_streak,
          total_score,
          correct_answers,
          questions_answered,
          join_date
        FROM users 
        WHERE is_active = true
        ORDER BY winning_streak DESC, total_score DESC
        LIMIT 5;
      `;
      
      const winningStreakResult = await client.query(winningStreakQuery);
      console.log(`✅ Found ${winningStreakResult.rows.length} users for winning streak leaderboard`);
      winningStreakResult.rows.forEach((user, index) => {
        const maskedPhone = user.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
        console.log(`   ${index + 1}. ${maskedPhone} - Winning Streak: ${user.winning_streak}, Score: ${user.total_score}`);
      });

      console.log('\n✅ All leaderboard queries completed successfully!');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Leaderboard test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testLeaderboardQueries();
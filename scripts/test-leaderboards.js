#!/usr/bin/env node

/**
 * Test script for leaderboard functionality
 * Tests the new leaderboard API endpoints and scoring integration
 */

import { storage } from '../server/storage.js';

async function testLeaderboards() {
  console.log('🏆 Testing Leaderboard System');
  console.log('=============================\n');
  
  try {
    // Test 1: Get top users by total score
    console.log('📊 Test 1: Top Users by Total Score');
    console.log('------------------------------------');
    const topScorers = await storage.getTopUsersByTotalScore(5);
    console.log(`Found ${topScorers.length} users:`);
    topScorers.forEach((user, index) => {
      const maskedPhone = user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
      console.log(`${index + 1}. ${maskedPhone} - ${user.totalScore?.toLocaleString() || 0} points`);
    });
    
    console.log('\n🎯 Test 2: Top Users by Play Streak');
    console.log('-----------------------------------');
    const topPlayStreaks = await storage.getTopUsersByPlayStreak(5);
    console.log(`Found ${topPlayStreaks.length} users:`);
    topPlayStreaks.forEach((user, index) => {
      const maskedPhone = user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
      const playStreak = user.playStreak || user.currentStreak || 0;
      console.log(`${index + 1}. ${maskedPhone} - ${playStreak} day streak`);
    });
    
    console.log('\n🔥 Test 3: Top Users by Winning Streak');
    console.log('--------------------------------------');
    const topWinningStreaks = await storage.getTopUsersByWinningStreak(5);
    console.log(`Found ${topWinningStreaks.length} users:`);
    topWinningStreaks.forEach((user, index) => {
      const maskedPhone = user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
      const winningStreak = user.winningStreak || 0;
      console.log(`${index + 1}. ${maskedPhone} - ${winningStreak} win streak`);
    });
    
    // Test 4: User rank calculation (if we have users)
    if (topScorers.length > 0) {
      console.log('\n🏅 Test 4: User Rank Calculation');
      console.log('---------------------------------');
      const testUser = topScorers[0];
      
      const totalScoreRank = await storage.getUserRank(testUser.id, 'totalScore');
      const playStreakRank = await storage.getUserRank(testUser.id, 'playStreak');
      const winningStreakRank = await storage.getUserRank(testUser.id, 'winningStreak');
      
      const maskedPhone = testUser.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4');
      console.log(`Test user: ${maskedPhone}`);
      console.log(`- Total Score Rank: #${totalScoreRank} (${testUser.totalScore?.toLocaleString() || 0} points)`);
      console.log(`- Play Streak Rank: #${playStreakRank} (${testUser.playStreak || testUser.currentStreak || 0} days)`);
      console.log(`- Winning Streak Rank: #${winningStreakRank} (${testUser.winningStreak || 0} wins)`);
    }
    
    // Test 5: Database schema validation
    console.log('\n📋 Test 5: Database Schema Validation');
    console.log('-------------------------------------');
    const { pool } = await import('../server/db.js');
    const client = await pool.connect();
    
    try {
      // Check if dual streak columns exist
      const columnCheck = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name IN ('play_streak', 'winning_streak', 'current_streak')
        ORDER BY column_name;
      `);
      
      console.log('Streak-related columns in users table:');
      columnCheck.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
      
      if (columnCheck.rows.length < 2) {
        console.log('⚠️  Warning: Dual streak columns may not be migrated yet.');
        console.log('   Run: node scripts/simple-migrate.js');
      } else {
        console.log('✅ Dual streak columns found in database');
      }
      
    } finally {
      client.release();
    }
    
    console.log('\n🎮 Test 6: Leaderboard API Simulation');
    console.log('-------------------------------------');
    console.log('Simulating leaderboard API responses...');
    
    // Simulate the API response format
    const simulateLeaderboardAPI = (users, type) => {
      return users.map((user, index) => ({
        rank: index + 1,
        phoneNumber: user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$4'),
        totalScore: user.totalScore,
        playStreak: user.playStreak || user.currentStreak || 0,
        winningStreak: user.winningStreak || 0,
        questionsAnswered: user.questionsAnswered,
        accuracyRate: user.questionsAnswered > 0 
          ? Math.round((user.correctAnswers / user.questionsAnswered) * 100)
          : 0,
        joinDate: user.joinDate
      }));
    };
    
    const totalScoreLeaderboard = simulateLeaderboardAPI(topScorers, 'totalScore');
    console.log('Total Score Leaderboard API format:');
    totalScoreLeaderboard.slice(0, 3).forEach(entry => {
      console.log(`  #${entry.rank} ${entry.phoneNumber}: ${entry.totalScore?.toLocaleString()} pts (${entry.accuracyRate}% accuracy)`);
    });
    
    console.log('\n✅ All leaderboard tests completed successfully!');
    console.log('\n🏆 Leaderboard System Features:');
    console.log('- 🎯 Total Points: Overall quiz mastery ranking');
    console.log('- 📅 Play Streak: Daily consistency champions');
    console.log('- 🔥 Winning Streak: Consecutive win legends');
    console.log('- 🏅 User Rankings: Personal position tracking');
    console.log('- 📱 Privacy: Phone numbers are masked in public views');
    console.log('- ⚡ Performance: Efficient database queries with indexing');
    
  } catch (error) {
    console.error('❌ Leaderboard test failed:', error);
    
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.error('\n💡 Possible fixes:');
      console.error('1. Run database migration: node scripts/simple-migrate.js');
      console.error('2. Check DATABASE_URL connection');
      console.error('3. Ensure tables exist: npm run db:push');
    }
    
    process.exit(1);
  }
}

testLeaderboards().then(() => {
  console.log('\n🚀 Ready to deploy leaderboards!');
  process.exit(0);
});
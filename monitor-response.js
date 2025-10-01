#!/usr/bin/env node

/**
 * Monitor for user response and verify feedback system works
 */

const PRODUCTION_URL = 'https://text4quiz.onrender.com';

async function checkUserStats() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/user/+15153570454/stats`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error checking stats:', error.message);
    return null;
  }
}

async function monitorResponseFlow() {
  console.log('📱 SMS Response Flow Monitor');
  console.log('===========================\n');
  
  // Get initial state
  console.log('📊 Checking initial state...');
  const initialStats = await checkUserStats();
  
  if (initialStats) {
    console.log(`✅ Initial stats for +15153570454:`);
    console.log(`   Questions answered: ${initialStats.stats.questionsAnswered}`);
    console.log(`   Total score: ${initialStats.stats.totalScore}`);
    console.log(`   Current streak: ${initialStats.stats.winningStreak}`);
    console.log(`   Recent answers: ${initialStats.recentAnswers.length}`);
    
    if (initialStats.recentAnswers.length > 0) {
      const mostRecent = initialStats.recentAnswers[0];
      console.log(`   Last question: "${mostRecent.questionText.substring(0, 50)}..."`);
      console.log(`   Last answer: ${mostRecent.userAnswer} (${mostRecent.isCorrect ? 'Correct' : 'Incorrect'})`);
      console.log(`   Date: ${mostRecent.answeredAt}`);
    }
  } else {
    console.log('❌ Could not fetch initial stats');
    return;
  }
  
  console.log('\n🎯 Test Status:');
  console.log('✅ Question sent to +15153570454');
  console.log('📱 Check your phone - you should see a properly formatted question');
  console.log('   • Question text with proper line breaks');
  console.log('   • Options A, B, C, D clearly separated');
  console.log('   • No literal \\n characters');
  
  console.log('\n⏳ Waiting for your response...');
  console.log('💬 When you reply A, B, C, or D, I\'ll monitor for:');
  console.log('   1. Webhook processing (should return Status 200)');
  console.log('   2. Stats update (new answer recorded)');
  console.log('   3. Feedback SMS sent with explanation');
  
  // Monitor for changes
  let checkCount = 0;
  const maxChecks = 60; // Monitor for 5 minutes (5-second intervals)
  
  const monitorInterval = setInterval(async () => {
    checkCount++;
    process.stdout.write(`\r⏱️  Monitoring... (${checkCount}/${maxChecks}) `);
    
    const currentStats = await checkUserStats();
    
    if (currentStats && currentStats.stats.questionsAnswered > initialStats.stats.questionsAnswered) {
      console.log('\n\n🎉 RESPONSE DETECTED!');
      console.log('==================');
      
      const newAnswer = currentStats.recentAnswers[0];
      console.log(`✅ New answer recorded:`);
      console.log(`   Question: "${newAnswer.questionText.substring(0, 60)}..."`);
      console.log(`   Your answer: ${newAnswer.userAnswer}`);
      console.log(`   Result: ${newAnswer.isCorrect ? 'Correct! 🎉' : 'Incorrect ❌'}`);
      console.log(`   Points earned: ${newAnswer.pointsEarned}`);
      console.log(`   Date: ${newAnswer.answeredAt}`);
      
      console.log(`\n📊 Updated stats:`);
      console.log(`   Total questions: ${currentStats.stats.questionsAnswered} (+1)`);
      console.log(`   Total score: ${currentStats.stats.totalScore} (+${newAnswer.pointsEarned})`);
      console.log(`   Accuracy: ${currentStats.stats.accuracyRate}%`);
      console.log(`   Winning streak: ${currentStats.stats.winningStreak}`);
      
      console.log('\n✅ SMS RESPONSE HANDLING - WORKING!');
      console.log('✅ STATS UPDATE - WORKING!');
      console.log('\n📱 Check your phone for feedback SMS with explanation');
      console.log('   The feedback should include:');
      console.log('   • Correct/Incorrect result');
      console.log('   • Detailed explanation');
      console.log('   • Updated streak and score');
      console.log('   • Proper formatting (no \\n literals)');
      
      clearInterval(monitorInterval);
      return;
    }
    
    if (checkCount >= maxChecks) {
      console.log('\n\n⏰ Monitoring timeout reached');
      console.log('No response detected within 5 minutes');
      console.log('📱 Check if you received the question SMS');
      console.log('💬 Try replying with A, B, C, or D');
      clearInterval(monitorInterval);
    }
  }, 5000); // Check every 5 seconds
  
  // Also show real-time webhook testing
  console.log('\n🔧 You can also test the webhook directly:');
  console.log('   Example: Reply "C" to your SMS');
  console.log('   This will trigger the webhook and update your stats');
}

monitorResponseFlow().catch(console.error);
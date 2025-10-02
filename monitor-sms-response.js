#!/usr/bin/env node

console.log('🔍 Monitoring SMS Response Flow...');
console.log('Please reply to the trivia question you just received!');
console.log('');

// Check initial stats and recent answers (both in one endpoint)
async function checkUserData() {
  try {
    const phoneNumber = encodeURIComponent('+15153570454');
    const response = await fetch(`https://text4quiz.onrender.com/api/user/${phoneNumber}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking user data:', error.message);
    return null;
  }
}

async function monitor() {
  console.log('📊 Checking initial user data...');
  const initialData = await checkUserData();
  if (initialData) {
    console.log('Initial stats:', {
      questionsAnswered: initialData.stats.questionsAnswered,
      currentStreak: initialData.stats.currentStreak,
      totalScore: initialData.stats.totalScore
    });
    
    if (initialData.recentAnswers) {
      console.log(`Found ${initialData.recentAnswers.length} recent answers`);
      if (initialData.recentAnswers.length > 0) {
        const latest = initialData.recentAnswers[0];
        console.log('Latest answer:', {
          answered: latest.userAnswer,
          correct: latest.isCorrect,
          points: latest.pointsEarned,
          date: new Date(latest.answeredAt).toLocaleString()
        });
      }
    }
  } else {
    console.log('❌ Could not get initial user data - monitoring may not work correctly');
  }

  console.log('');
  console.log('⏳ Monitoring for response (checking every 5 seconds for 3 minutes)...');
  console.log('Reply to your SMS with A, B, C, or D');
  console.log('');

  let checkCount = 0;
  const maxChecks = 36; // 3 minutes at 5-second intervals

  const checkInterval = setInterval(async () => {
    checkCount++;
    
    const currentData = await checkUserData();
    
    if (!currentData) {
      process.stdout.write(`\r⚠️  API error (${checkCount}/${maxChecks})`);
      if (checkCount >= maxChecks) {
        console.log('\n❌ Monitoring stopped due to API errors');
        clearInterval(checkInterval);
      }
      return;
    }
    
    // Check if stats have changed
    let statsChanged = false;
    if (initialData?.stats && currentData.stats) {
      statsChanged = 
        initialData.stats.questionsAnswered !== currentData.stats.questionsAnswered ||
        initialData.stats.currentStreak !== currentData.stats.currentStreak ||
        initialData.stats.totalScore !== currentData.stats.totalScore;
    }
    
    // Check if new answer was recorded
    let newAnswer = false;
    if (initialData?.recentAnswers && currentData.recentAnswers) {
      newAnswer = currentData.recentAnswers.length > initialData.recentAnswers.length;
      
      // Also check if the most recent answer has changed
      if (!newAnswer && currentData.recentAnswers.length > 0 && initialData.recentAnswers.length > 0) {
        const currentLatest = currentData.recentAnswers[0];
        const initialLatest = initialData.recentAnswers[0];
        newAnswer = currentLatest.id !== initialLatest.id;
      }
    }
    
    if (statsChanged || newAnswer) {
      console.log(`\n✅ [${new Date().toLocaleTimeString()}] Response detected!`);
      
      if (initialData?.stats && currentData.stats) {
        console.log('📊 Updated stats:', {
          questionsAnswered: `${initialData.stats.questionsAnswered} → ${currentData.stats.questionsAnswered}`,
          currentStreak: `${initialData.stats.currentStreak} → ${currentData.stats.currentStreak}`,
          totalScore: `${initialData.stats.totalScore} → ${currentData.stats.totalScore}`
        });
      }
      
      if (currentData.recentAnswers && currentData.recentAnswers.length > 0) {
        const latest = currentData.recentAnswers[0];
        console.log('📝 Latest answer:', {
          userAnswer: latest.userAnswer,
          isCorrect: latest.isCorrect,
          pointsEarned: latest.pointsEarned,
          question: latest.questionText?.substring(0, 50) + '...',
          category: latest.category
        });
      }
      
      console.log('🎉 SMS response flow working correctly!');
      console.log('✅ The webhook processed your SMS and updated your stats!');
      console.log('✅ You should have received a feedback SMS with the explanation!');
      clearInterval(checkInterval);
      return;
    }
    
    process.stdout.write(`\r⏳ Monitoring... (${checkCount}/${maxChecks} checks)`);
    
    if (checkCount >= maxChecks) {
      console.log('\n⏰ Monitoring timeout - no response detected');
      console.log('Please check:');
      console.log('- Did you reply to the SMS?');
      console.log('- Is your Twilio webhook URL correct?');
      console.log('- Check server logs for webhook errors');
      clearInterval(checkInterval);
    }
  }, 5000);
}

monitor().catch(console.error);
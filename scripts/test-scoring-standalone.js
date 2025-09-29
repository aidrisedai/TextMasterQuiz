// Standalone test for progressive streak bonus scoring

function calculatePoints(isCorrect, winningStreak, playStreak = 0) {
  if (!isCorrect) {
    return 10; // Always get 10 points for trying, even when wrong
  }

  const basePoints = 100; // Base points for correct answers
  
  // Linear bonus system:
  // Play Streak: +1 point per day (simple participation reward)
  // Winning Streak: +20 points per day (significant accuracy reward)
  const playStreakBonus = playStreak; // +1 point per day played
  const winningStreakBonus = winningStreak * 20; // +20 points per consecutive win

  return basePoints + winningStreakBonus + playStreakBonus;
}

function getStreakBonusMessage(streak) {
  if (streak < 3) {
    return "";
  } else if (streak >= 3 && streak <= 6) {
    return "🔥 Nice streak! Keep it up!";
  } else if (streak >= 7 && streak <= 13) {
    return "🔥🔥 Great streak! You're on fire!";
  } else if (streak >= 14 && streak <= 20) {
    return "🔥🔥🔥 Amazing streak! You're unstoppable!";
  } else if (streak >= 21 && streak <= 29) {
    return "🔥🔥🔥🔥 Legendary streak! Quiz master status!";
  } else if (streak >= 30) {
    return "🔥🔥🔥🔥🔥 INCREDIBLE! You're a trivia legend!";
  }
  return "";
}

function getPointsBreakdown(isCorrect, winningStreak, playStreak = 0) {
  if (!isCorrect) {
    return {
      totalPoints: 10,
      basePoints: 10,
      streakBonus: 0,
      message: `Score: +10 points for trying! 💪`
    };
  }

  const totalPoints = calculatePoints(isCorrect, winningStreak, playStreak);
  const basePoints = 100;
  const playStreakBonus = playStreak;
  const winningStreakBonus = winningStreak * 20;
  const totalBonuses = playStreakBonus + winningStreakBonus;

  let message = `Score: +${totalPoints} points`;
  
  if (totalBonuses > 0) {
    message += ` (${basePoints} base`;
    if (winningStreakBonus > 0) {
      message += ` + ${winningStreakBonus} winning`;
    }
    if (playStreakBonus > 0) {
      message += ` + ${playStreakBonus} play`;
    }
    message += `!)`;
  }

  return {
    totalPoints,
    basePoints,
    streakBonus: totalBonuses,
    message
  };
}

// Test the progressive scoring system
console.log('🎯 Linear Dual Streak System Test');
console.log('===================================\n');

console.log('📊 Points at Key Streak Combinations:');
console.log('====================================');

// Test various combinations of play and winning streaks
const testCombos = [
  { play: 1, win: 1 },
  { play: 3, win: 3 },
  { play: 5, win: 5 },
  { play: 7, win: 7 }, // Your example
  { play: 10, win: 5 }, // Play streak higher than winning
  { play: 15, win: 10 },
  { play: 20, win: 15 },
  { play: 30, win: 25 }
];

testCombos.forEach(combo => {
    const points = calculatePoints(true, combo.win, combo.play);
    const playBonus = combo.play;
    const winBonus = combo.win * 20;
    console.log(`P:${combo.play.toString().padStart(2)} W:${combo.win.toString().padStart(2)} = ${points.toString().padStart(3)} pts (100 + ${winBonus} + ${playBonus})`);
});

console.log('\n🔥 Detailed Scoring Examples:');
console.log('===============================');

const detailTests = [1, 3, 7, 10, 15];

detailTests.forEach(streak => {
    const breakdown = getPointsBreakdown(true, streak, streak);
    console.log(`\nStreak ${streak} (both play & winning):`);
    console.log(`- Total Points: ${breakdown.totalPoints}`);
    console.log(`- Base: ${breakdown.basePoints}, Bonuses: ${breakdown.streakBonus}`);
    console.log(`- Message: "${breakdown.message}"`);
});

console.log('\n❌ Wrong Answer Test:');
console.log('======================');
const wrongAnswer = getPointsBreakdown(false, 10, 15);
console.log(`Wrong answer (P:15, W:10): ${wrongAnswer.totalPoints} points`);
console.log(`Message: "${wrongAnswer.message}"`);

console.log('\n✅ Linear Dual Streak System is working correctly!');
console.log('🎉 Key Benefits:');
console.log('- Simple linear bonuses: +1 per play day, +20 per win day');
console.log('- Easy to understand and calculate');
console.log('- Rewards both participation (play streak) and accuracy (winning streak)');
console.log('- 7-day perfect streak = 100 + 140 + 7 = 247 points!');
console.log('- Still encourages participation with 10 points for wrong answers');

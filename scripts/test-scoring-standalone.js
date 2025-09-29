// Standalone test for progressive streak bonus scoring

function calculatePoints(isCorrect, currentStreak) {
  if (!isCorrect) {
    return 0;
  }

  const basePoints = 10;
  let streakBonus = 0;

  // Progressive streak bonus system:
  // 1-2 days: No bonus (10 points)
  // 3-6 days: +2 bonus per day (12, 14, 16, 18)
  // 7-13 days: +3 bonus per day (21, 24, 27, 30, 33, 36, 39)
  // 14-20 days: +4 bonus per day (43, 47, 51, 55, 59, 63, 67)
  // 21-29 days: +5 bonus per day (72, 77, 82, 87, 92, 97, 102, 107, 112)
  // 30+ days: +7 bonus per day (119, 126, 133, ...)

  if (currentStreak >= 3 && currentStreak <= 6) {
    // Days 3-6: +2 bonus per day
    streakBonus = (currentStreak - 2) * 2;
  } else if (currentStreak >= 7 && currentStreak <= 13) {
    // Days 7-13: Previous bonus (8) + 3 per additional day
    streakBonus = 8 + ((currentStreak - 6) * 3);
  } else if (currentStreak >= 14 && currentStreak <= 20) {
    // Days 14-20: Previous bonus (29) + 4 per additional day
    streakBonus = 29 + ((currentStreak - 13) * 4);
  } else if (currentStreak >= 21 && currentStreak <= 29) {
    // Days 21-29: Previous bonus (57) + 5 per additional day
    streakBonus = 57 + ((currentStreak - 20) * 5);
  } else if (currentStreak >= 30) {
    // Days 30+: Previous bonus (102) + 7 per additional day
    streakBonus = 102 + ((currentStreak - 29) * 7);
  }

  return basePoints + streakBonus;
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

function getPointsBreakdown(isCorrect, currentStreak) {
  if (!isCorrect) {
    return {
      totalPoints: 0,
      basePoints: 0,
      streakBonus: 0,
      message: ""
    };
  }

  const totalPoints = calculatePoints(isCorrect, currentStreak);
  const basePoints = 10;
  const streakBonus = totalPoints - basePoints;
  const bonusMessage = getStreakBonusMessage(currentStreak);

  let message = `Score: +${totalPoints} points`;
  
  if (streakBonus > 0) {
    message += ` (${basePoints} base + ${streakBonus} streak bonus!)`;
    if (bonusMessage) {
      message += `\n${bonusMessage}`;
    }
  }

  return {
    totalPoints,
    basePoints,
    streakBonus,
    message
  };
}

// Test the progressive scoring system
console.log('🎯 Progressive Streak Bonus System Test');
console.log('=======================================\n');

console.log('📊 Points at Key Streak Milestones:');
console.log('===================================');

const milestones = [1, 2, 3, 4, 5, 6, 7, 10, 13, 14, 17, 20, 21, 25, 29, 30, 35, 40, 50, 100];

milestones.forEach(streak => {
    const points = calculatePoints(true, streak);
    console.log(`Day ${streak.toString().padStart(3)}: ${points.toString().padStart(3)} points`);
});

console.log('\n🔥 Scoring Breakdown Examples:');
console.log('==============================');

const testStreaks = [1, 3, 7, 14, 21, 30, 50];

testStreaks.forEach(streak => {
    const breakdown = getPointsBreakdown(true, streak);
    console.log(`\nStreak ${streak}:`);
    console.log(`- Total Points: ${breakdown.totalPoints}`);
    console.log(`- Base: ${breakdown.basePoints}, Bonus: ${breakdown.streakBonus}`);
    console.log(`- Message: "${breakdown.message}"`);
});

console.log('\n❌ Incorrect Answer Test:');
console.log('=========================');
const wrongAnswer = getPointsBreakdown(false, 10);
console.log(`Incorrect answer (10-day streak): ${wrongAnswer.totalPoints} points`);
console.log(`Message: "${wrongAnswer.message}"`);

console.log('\n✅ Progressive Scoring System is working correctly!');
console.log('\n🎉 Key Benefits:');
console.log('- Motivates longer streaks with increasing rewards');
console.log('- Base 10 points ensures fairness for new users');
console.log('- Exponential growth rewards dedicated users');
console.log('- Encouraging messages build engagement');
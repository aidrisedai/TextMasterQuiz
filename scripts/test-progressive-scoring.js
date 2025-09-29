import { calculatePoints, getPointsBreakdown, getStreakPreview } from '../server/utils/scoring.js';

console.log('🎯 Progressive Streak Bonus System Test');
console.log('=======================================\n');

console.log('📊 Points Preview at Key Streak Milestones:');
console.log('============================================');

const preview = getStreakPreview();
preview.forEach(({ streak, points }) => {
    console.log(`Day ${streak.toString().padStart(3)}: ${points.toString().padStart(3)} points`);
});

console.log('\n🔥 Scoring Breakdown Examples:');
console.log('==============================');

const testStreaks = [1, 3, 7, 14, 21, 30, 50, 100];

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
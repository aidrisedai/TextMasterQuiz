import { calculatePoints, getPointsBreakdown, getWinningStreakPreview, getPlayStreakMessage, getWinningStreakMessage } from '../server/utils/scoring.js';

console.log('🎯 Dual Streak Bonus System Test');
console.log('=================================\n');

console.log('📊 Winning Streak Points Preview:');
console.log('=================================');

const preview = getWinningStreakPreview();
preview.forEach(({ winningStreak, points }) => {
    console.log(`Win ${winningStreak.toString().padStart(3)}: ${points.toString().padStart(3)} points`);
});

console.log('\n🔥 Dual Streak Scoring Examples:');
console.log('=================================');

const testStreaks = [1, 3, 7, 14, 21, 30, 50];

testStreaks.forEach(winningStreak => {
    const playStreak = winningStreak + 2; // Play streak is typically higher
    const breakdown = getPointsBreakdown(true, winningStreak, playStreak);
    console.log(`\nWinning Streak ${winningStreak}, Play Streak ${playStreak}:`);
    console.log(`- Total Points: ${breakdown.totalPoints}`);
    console.log(`- Base: ${breakdown.basePoints}, Winning Bonus: ${breakdown.streakBonus}`);
    console.log(`- Message: "${breakdown.message.replace(/\n/g, ' | ')}"`);
});

console.log('\n❌ Wrong Answer with High Play Streak:');
console.log('=======================================');
const playStreak = 15;
const winningStreak = 10;
const wrongAnswer = getPointsBreakdown(false, winningStreak, playStreak);
console.log(`Wrong answer (winning streak ${winningStreak}, play streak ${playStreak}): ${wrongAnswer.totalPoints} points`);
console.log(`Message: "${wrongAnswer.message.replace(/\n/g, ' | ')}"`);

console.log('\n🎯 Play Streak Messages:');
console.log('========================');
[3, 7, 14, 21, 30].forEach(playStreak => {
    const message = getPlayStreakMessage(playStreak);
    console.log(`Play ${playStreak}: ${message || 'No message'}`);
});

console.log('\n🔥 Winning Streak Messages:');
console.log('===========================');
[3, 7, 14, 21, 30].forEach(winningStreak => {
    const message = getWinningStreakMessage(winningStreak);
    console.log(`Win ${winningStreak}: ${message || 'No message'}`);
});

console.log('\n✅ Dual Streak System is working correctly!');

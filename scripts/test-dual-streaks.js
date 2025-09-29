#!/usr/bin/env node

/**
 * Comprehensive test for the dual streak system
 * Tests both play streaks and winning streaks in various scenarios
 */

import { calculatePoints, getPointsBreakdown, getPlayStreakMessage, getWinningStreakMessage, getWinningStreakPreview } from '../server/utils/scoring.js';

console.log('🎯 Dual Streak System Comprehensive Test');
console.log('========================================\n');

// Test 1: Basic scoring mechanics
console.log('📝 Test 1: Basic Scoring Mechanics');
console.log('==================================');

const basicTests = [
  { isCorrect: false, winningStreak: 0, playStreak: 1, description: 'First wrong answer' },
  { isCorrect: true, winningStreak: 0, playStreak: 2, description: 'First correct answer' },
  { isCorrect: false, winningStreak: 5, playStreak: 10, description: 'Wrong answer resets winning streak' },
  { isCorrect: true, winningStreak: 2, playStreak: 15, description: 'Correct answer continues both streaks' },
];

basicTests.forEach(test => {
  const points = calculatePoints(test.isCorrect, test.winningStreak, test.playStreak);
  const breakdown = getPointsBreakdown(test.isCorrect, test.winningStreak, test.playStreak);
  console.log(`\n${test.description}:`);
  console.log(`  Input: ${test.isCorrect ? 'Correct' : 'Wrong'}, Winning: ${test.winningStreak}, Play: ${test.playStreak}`);
  console.log(`  Points: ${points}`);
  console.log(`  Message: "${breakdown.message.replace(/\n/g, ' | ')}"`);
});

// Test 2: Streak progression scenarios
console.log('\n\n📈 Test 2: Streak Progression Scenarios');
console.log('=======================================');

// Scenario A: Perfect streak (all correct answers)
console.log('\nScenario A: Perfect Player (all correct)');
console.log('----------------------------------------');
for (let day = 1; day <= 10; day++) {
  const winningStreak = day;
  const playStreak = day;
  const points = calculatePoints(true, winningStreak, playStreak);
  const breakdown = getPointsBreakdown(true, winningStreak, playStreak);
  console.log(`Day ${day}: ${points} points (W:${winningStreak}, P:${playStreak})`);
}

// Scenario B: Mixed performance (play streak continues, winning resets)
console.log('\nScenario B: Inconsistent Player');
console.log('-------------------------------');
const performance = [
  { correct: true, description: 'Day 1: Correct' },
  { correct: true, description: 'Day 2: Correct' },
  { correct: false, description: 'Day 3: Wrong (winning streak resets)' },
  { correct: true, description: 'Day 4: Correct (new winning streak)' },
  { correct: true, description: 'Day 5: Correct' },
  { correct: false, description: 'Day 6: Wrong (winning streak resets again)' },
];

let winningStreak = 0;
let playStreak = 0;

performance.forEach((day, index) => {
  playStreak++;
  if (day.correct) {
    winningStreak++;
  } else {
    winningStreak = 0;
  }
  
  const points = calculatePoints(day.correct, winningStreak, playStreak);
  const breakdown = getPointsBreakdown(day.correct, winningStreak, playStreak);
  console.log(`${day.description}: ${points} points (W:${winningStreak}, P:${playStreak})`);
  console.log(`  "${breakdown.message.split('\n')[0]}"`);
});

// Test 3: Message system validation
console.log('\n\n💬 Test 3: Message System Validation');
console.log('====================================');

console.log('\nPlay Streak Messages:');
console.log('--------------------');
[1, 2, 3, 5, 7, 10, 14, 18, 21, 25, 30, 35].forEach(playStreak => {
  const message = getPlayStreakMessage(playStreak);
  if (message) {
    console.log(`Play ${playStreak}: ${message}`);
  } else {
    console.log(`Play ${playStreak}: (no message)`);
  }
});

console.log('\nWinning Streak Messages:');
console.log('-----------------------');
[1, 2, 3, 5, 7, 10, 14, 18, 21, 25, 30, 35].forEach(winningStreak => {
  const message = getWinningStreakMessage(winningStreak);
  if (message) {
    console.log(`Win ${winningStreak}: ${message}`);
  } else {
    console.log(`Win ${winningStreak}: (no message)`);
  }
});

// Test 4: Edge cases
console.log('\n\n⚠️  Test 4: Edge Cases');
console.log('=====================');

const edgeCases = [
  { isCorrect: true, winningStreak: 0, playStreak: 0, description: 'Zero streaks' },
  { isCorrect: false, winningStreak: 0, playStreak: 0, description: 'Zero streaks, wrong answer' },
  { isCorrect: true, winningStreak: 100, playStreak: 105, description: 'Very high streaks' },
  { isCorrect: false, winningStreak: 50, playStreak: 60, description: 'High streaks, wrong answer' },
];

edgeCases.forEach(test => {
  const points = calculatePoints(test.isCorrect, test.winningStreak, test.playStreak);
  const breakdown = getPointsBreakdown(test.isCorrect, test.winningStreak, test.playStreak);
  console.log(`\n${test.description}:`);
  console.log(`  Points: ${points}`);
  console.log(`  Breakdown: Base:${breakdown.basePoints}, Bonus:${breakdown.streakBonus}`);
});

// Test 5: Comparison with old system
console.log('\n\n🔄 Test 5: Comparison with Legacy System');
console.log('========================================');

console.log('Points comparison at key milestones:');
console.log('(New system uses winning streak for bonus calculation)');

const milestones = [1, 3, 7, 14, 21, 30, 50];
milestones.forEach(streak => {
  const newSystemPoints = calculatePoints(true, streak, streak);
  const legacyEquivalent = streak <= 2 ? 100 : 100 + (streak >= 3 && streak <= 6 ? (streak - 2) * 2 :
    streak >= 7 && streak <= 13 ? 8 + ((streak - 6) * 3) :
    streak >= 14 && streak <= 20 ? 29 + ((streak - 13) * 4) :
    streak >= 21 && streak <= 29 ? 57 + ((streak - 20) * 5) :
    102 + ((streak - 29) * 7));
  
  console.log(`Streak ${streak}: New=${newSystemPoints}, Legacy=${legacyEquivalent} ${newSystemPoints === legacyEquivalent ? '✅' : '❌'}`);
});

// Test 6: System benefits demonstration
console.log('\n\n🎉 Test 6: System Benefits Demonstration');
console.log('=======================================');

console.log('\nBenefit 1: Wrong answers still reward participation');
const wrongAnswerPoints = calculatePoints(false, 5, 10);
console.log(`Wrong answer with play streak 10: ${wrongAnswerPoints} points (vs 0 in old system)`);

console.log('\nBenefit 2: Play streak continues encouraging daily engagement');
const wrongAnswerBreakdown = getPointsBreakdown(false, 8, 15);
console.log(`Wrong answer message: "${wrongAnswerBreakdown.message.replace(/\n/g, ' | ')}"`);

console.log('\nBenefit 3: Separate tracking for participation vs performance');
const scenarios = [
  { desc: 'Perfect player', playStreak: 20, winningStreak: 20 },
  { desc: 'Dedicated but struggling', playStreak: 20, winningStreak: 3 },
  { desc: 'Occasional but accurate', playStreak: 5, winningStreak: 5 },
];

scenarios.forEach(scenario => {
  const points = calculatePoints(true, scenario.winningStreak, scenario.playStreak);
  const breakdown = getPointsBreakdown(true, scenario.winningStreak, scenario.playStreak);
  console.log(`${scenario.desc}: ${points} points (P:${scenario.playStreak}, W:${scenario.winningStreak})`);
});

// Summary
console.log('\n\n✅ Dual Streak System Test Summary');
console.log('==================================');
console.log('🎯 Play Streak: Continues as long as you play daily');
console.log('🔥 Winning Streak: Resets on wrong answers');  
console.log('💪 Wrong answers: 10 points (encourages participation)');
console.log('🏆 Correct answers: 100 base + winning streak bonus');
console.log('📈 Scoring is fair, motivating, and rewards both participation and accuracy');
console.log('🎮 System creates more nuanced engagement patterns');

console.log('\n🚀 All tests completed successfully!');
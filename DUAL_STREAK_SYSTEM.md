# Dual Streak System

## Overview

The TextMasterQuiz app now features a sophisticated **dual streak system** that tracks both participation and performance separately, creating more nuanced and engaging user experiences.

## The Two Streak Types

### 🎯 Play Streak
- **Continues as long as you play daily**
- Never resets on wrong answers
- Encourages consistent daily participation
- Used for participation-based messaging and milestones

### 🔥 Winning Streak  
- **Resets when you get a wrong answer**
- Only counts consecutive correct answers
- Used for calculating bonus points
- Rewards accuracy and knowledge retention

## Scoring System

### Wrong Answers
- **10 points** for trying (encourages participation)
- Play streak continues (+1)
- Winning streak resets to 0
- Encouraging message: "Score: +10 points for trying! 💪"

### Correct Answers
- **100 base points** + winning streak bonus
- Both play streak and winning streak continue (+1 each)
- Progressive bonus based on winning streak length

## Linear Bonus Calculation

### Simple Formula
- **Correct Answer Points** = 100 + (winningStreak × 20) + (playStreak × 1)
- **Wrong Answer Points** = 10 (no bonuses)

### Examples
| Play | Win | Calculation | Total Points |
|---|---|---|---|
| 1 | 1 | 100 + 20 + 1 | 121 |
| 3 | 3 | 100 + 60 + 3 | 163 |
| 7 | 7 | 100 + 140 + 7 | **247** |
| 10 | 5 | 100 + 100 + 10 | 210 |
| 15 | 10 | 100 + 200 + 15 | 315 |
| 30 | 25 | 100 + 500 + 30 | 630 |

## Message System

### Play Streak Messages (🎯)
- **3-6 days**: "🎯 Nice play streak! Keep it up!"
- **7-13 days**: "🎯🎯 Great play streak! You're dedicated!"
- **14-20 days**: "🎯🎯🎯 Amazing play streak! Daily champion!"
- **21-29 days**: "🎯🎯🎯🎯 Legendary play streak! Quiz devotee!"
- **30+ days**: "🎯🎯🎯🎯🎯 INCREDIBLE play streak! True quiz master!"

### Winning Streak Messages (🔥)
- **3-6 wins**: "🔥 Nice winning streak! Keep it up!"
- **7-13 wins**: "🔥🔥 Great winning streak! You're on fire!"
- **14-20 wins**: "🔥🔥🔥 Amazing winning streak! Unstoppable!"
- **21-29 wins**: "🔥🔥🔥🔥 Legendary winning streak! Quiz master!"
- **30+ wins**: "🔥🔥🔥🔥🔥 INCREDIBLE winning streak! Trivia legend!"

## Example Scenarios

### Scenario 1: Perfect Player
- **Day 1**: Correct → 121 points (W:1, P:1) = 100 + 20 + 1
- **Day 2**: Correct → 142 points (W:2, P:2) = 100 + 40 + 2
- **Day 3**: Correct → 163 points (W:3, P:3) = 100 + 60 + 3 + "Nice winning streak!"
- **Day 7**: Correct → **247 points** (W:7, P:7) = 100 + 140 + 7 + "Great winning streak!"

### Scenario 2: Dedicated but Struggling Player
- **Day 1**: Correct → 121 points (W:1, P:1) = 100 + 20 + 1
- **Day 2**: Wrong → 10 points (W:0, P:2) + "Thanks for trying!"
- **Day 3**: Correct → 123 points (W:1, P:3) = 100 + 20 + 3 + "Nice play streak!"
- **Day 4**: Wrong → 10 points (W:0, P:4) + "Great play streak continues!"

### Scenario 3: Wrong Answer with High Streaks
- **Current**: 10-win streak, 15-day play streak
- **Wrong Answer**: 10 points + "Score: +10 points for trying! 💪" + "🎯🎯🎯 Amazing play streak! Daily champion!" + "⚠️ Winning streak reset, but your 15-day play streak continues!"

## Benefits

### 1. **Encourages Participation**
- Wrong answers still give points (10 vs 0 in old system)
- Play streak continues regardless of correctness
- Reduces frustration from wrong answers

### 2. **Rewards Accuracy** 
- Winning streak bonuses reward knowledge and skill
- Higher point values for consistent correct answers
- Clear distinction between participation and performance

### 3. **More Nuanced Engagement**
- Different player types get appropriate recognition
- Dedicated players (high play streak) vs accurate players (high winning streak)
- Multiple paths to achievement and recognition

### 4. **Balanced Motivation**
- Play streaks motivate daily habits
- Winning streaks motivate learning and accuracy
- System accommodates different learning styles

## Technical Implementation

### Database Schema
```sql
ALTER TABLE users ADD COLUMN play_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN winning_streak INTEGER NOT NULL DEFAULT 0;
```

### Streak Update Logic
```typescript
// Play streak always increments when playing
playStreak += 1;

// Winning streak only increments on correct answers
if (isCorrect) {
  winningStreak += 1;
} else {
  winningStreak = 0; // Reset on wrong answer
}
```

### Points Calculation
```typescript
function calculatePoints(isCorrect: boolean, winningStreak: number, playStreak: number): number {
  if (!isCorrect) {
    return 10; // Always get 10 points for trying
  }
  
  const basePoints = 100;
  const streakBonus = calculateWinningStreakBonus(winningStreak);
  return basePoints + streakBonus;
}
```

## Migration

### Automatic Migration
- Existing users' `current_streak` values are copied to both `play_streak` and `winning_streak`
- This provides a smooth transition while maintaining historical data
- Legacy `current_streak` field is kept for backward compatibility

### Migration Command
```bash
# Migrate existing users to dual streak system
node scripts/migrate-dual-streaks.js

# Rollback if needed
node scripts/migrate-dual-streaks.js rollback
```

## Testing

### Test Scripts
- `scripts/test-dual-streaks.js` - Comprehensive dual streak system test
- `scripts/test-progressive-scoring.js` - Updated for dual streaks  
- `scripts/test-scoring-standalone.js` - Updated standalone test

### Test Coverage
- ✅ Basic scoring mechanics
- ✅ Streak progression scenarios
- ✅ Message system validation
- ✅ Edge cases handling
- ✅ Legacy system compatibility
- ✅ Migration functionality

## User Experience Impact

### Before (Single Streak)
- Wrong answers: 0 points, streak reset → frustration
- Single metric doesn't distinguish participation from performance
- Less forgiving for learning players

### After (Dual Streaks)
- Wrong answers: 10 points, play streak continues → encouragement
- Separate tracking for dedication vs accuracy
- Multiple achievement paths and recognition types
- More engaging and motivating for all player types

---

The dual streak system creates a more sophisticated, fair, and engaging scoring mechanism that rewards both consistency and accuracy while maintaining strong motivation for daily participation.
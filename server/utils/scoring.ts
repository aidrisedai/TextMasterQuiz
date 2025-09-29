/**
 * Dual streak bonus scoring system
 * Play Streak: Continues as long as you play daily (used for messaging and play milestones)
 * Winning Streak: Resets on wrong answers (used for bonus points calculation)
 * 
 * +10 points for wrong answers (no streak bonus, winning streak resets)
 * +100 points for correct answers + winning streak bonus that increases with longer winning streaks
 */

export function calculatePoints(isCorrect: boolean, winningStreak: number, playStreak: number = 0): number {
  if (!isCorrect) {
    return 10; // Always get 10 points for trying, even when wrong
  }

  const basePoints = 100; // Increased base points for correct answers
  let streakBonus = 0;

  // Progressive winning streak bonus system:
  // Wrong answers: 10 points (no streak bonus, winning streak resets to 0)
  // 1-2 correct: No bonus (100 points)
  // 3-6 correct: +2 bonus per win (102, 104, 106, 108)
  // 7-13 correct: +3 bonus per win (111, 114, 117, 120, 123, 126, 129)
  // 14-20 correct: +4 bonus per win (133, 137, 141, 145, 149, 153, 157)
  // 21-29 correct: +5 bonus per win (162, 167, 172, 177, 182, 187, 192, 197, 202)
  // 30+ correct: +7 bonus per win (209, 216, 223, ...)

  if (winningStreak >= 3 && winningStreak <= 6) {
    // Wins 3-6: +2 bonus per win
    streakBonus = (winningStreak - 2) * 2;
  } else if (winningStreak >= 7 && winningStreak <= 13) {
    // Wins 7-13: Previous bonus (8) + 3 per additional win
    streakBonus = 8 + ((winningStreak - 6) * 3);
  } else if (winningStreak >= 14 && winningStreak <= 20) {
    // Wins 14-20: Previous bonus (29) + 4 per additional win
    streakBonus = 29 + ((winningStreak - 13) * 4);
  } else if (winningStreak >= 21 && winningStreak <= 29) {
    // Wins 21-29: Previous bonus (57) + 5 per additional win
    streakBonus = 57 + ((winningStreak - 20) * 5);
  } else if (winningStreak >= 30) {
    // Wins 30+: Previous bonus (102) + 7 per additional win
    streakBonus = 102 + ((winningStreak - 29) * 7);
  }

  return basePoints + streakBonus;
}

/**
 * Get a descriptive message about the current play streak (for encouragement)
 * Uses play streak since it continues regardless of right/wrong answers
 */
export function getPlayStreakMessage(playStreak: number): string {
  if (playStreak < 3) {
    return "";
  } else if (playStreak >= 3 && playStreak <= 6) {
    return "🎯 Nice play streak! Keep it up!";
  } else if (playStreak >= 7 && playStreak <= 13) {
    return "🎯🎯 Great play streak! You're dedicated!";
  } else if (playStreak >= 14 && playStreak <= 20) {
    return "🎯🎯🎯 Amazing play streak! Daily champion!";
  } else if (playStreak >= 21 && playStreak <= 29) {
    return "🎯🎯🎯🎯 Legendary play streak! Quiz devotee!";
  } else if (playStreak >= 30) {
    return "🎯🎯🎯🎯🎯 INCREDIBLE play streak! True quiz master!";
  }
  return "";
}

/**
 * Get a descriptive message about the current winning streak (for points bonus)
 */
export function getWinningStreakMessage(winningStreak: number): string {
  if (winningStreak < 3) {
    return "";
  } else if (winningStreak >= 3 && winningStreak <= 6) {
    return "🔥 Nice winning streak! Keep it up!";
  } else if (winningStreak >= 7 && winningStreak <= 13) {
    return "🔥🔥 Great winning streak! You're on fire!";
  } else if (winningStreak >= 14 && winningStreak <= 20) {
    return "🔥🔥🔥 Amazing winning streak! Unstoppable!";
  } else if (winningStreak >= 21 && winningStreak <= 29) {
    return "🔥🔥🔥🔥 Legendary winning streak! Quiz master!";
  } else if (winningStreak >= 30) {
    return "🔥🔥🔥🔥🔥 INCREDIBLE winning streak! Trivia legend!";
  }
  return "";
}

/**
 * Get breakdown of points showing base + bonus with dual streak system
 */
export function getPointsBreakdown(isCorrect: boolean, winningStreak: number, playStreak: number = 0): {
  totalPoints: number;
  basePoints: number;
  streakBonus: number;
  message: string;
} {
  const totalPoints = calculatePoints(isCorrect, winningStreak, playStreak);
  
  if (!isCorrect) {
    const playMessage = getPlayStreakMessage(playStreak);
    let message = `Score: +10 points for trying! 💪`;
    if (playMessage) {
      message += `\n${playMessage}`;
    }
    if (winningStreak > 0) {
      message += `\n⚠️ Winning streak reset, but your ${playStreak}-day play streak continues!`;
    }
    
    return {
      totalPoints: 10,
      basePoints: 10,
      streakBonus: 0,
      message
    };
  }

  const basePoints = 100;
  const streakBonus = totalPoints - basePoints;
  const winningMessage = getWinningStreakMessage(winningStreak);
  const playMessage = getPlayStreakMessage(playStreak);

  let message = `Score: +${totalPoints} points`;
  
  if (streakBonus > 0) {
    message += ` (${basePoints} base + ${streakBonus} winning bonus!)`;
    if (winningMessage) {
      message += `\n${winningMessage}`;
    }
  }
  
  if (playMessage && playMessage !== winningMessage) {
    message += `\n${playMessage}`;
  }

  return {
    totalPoints,
    basePoints,
    streakBonus,
    message
  };
}

/**
 * Preview of points at different winning streak levels for documentation/testing
 */
export function getWinningStreakPreview(): { winningStreak: number, points: number }[] {
  const preview = [];
  
  // Sample key winning streak milestones
  const milestones = [1, 2, 3, 4, 5, 6, 7, 10, 13, 14, 17, 20, 21, 25, 29, 30, 35, 40, 50, 100];
  
  for (const winningStreak of milestones) {
    preview.push({
      winningStreak,
      points: calculatePoints(true, winningStreak, 0)
    });
  }
  
  return preview;
}

/**
 * Backward compatibility function (uses winning streak for points)
 */
export function getStreakPreview(): { streak: number, points: number }[] {
  return getWinningStreakPreview().map(({ winningStreak, points }) => ({
    streak: winningStreak,
    points
  }));
}

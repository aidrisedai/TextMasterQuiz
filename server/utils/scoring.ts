/**
 * Linear dual streak bonus scoring system
 * Play Streak: Continues as long as you play daily (+1 point per day)
 * Winning Streak: Resets on wrong answers (+20 points per consecutive win)
 * 
 * Wrong answers: 10 points (no bonuses, winning streak resets, play streak continues)
 * Correct answers: 100 base + (winningStreak * 20) + (playStreak * 1) points
 * 
 * Example: 7-day winning streak with 7-day play streak = 100 + 140 + 7 = 247 points
 */

export function calculatePoints(isCorrect: boolean, winningStreak: number, playStreak: number = 0): number {
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
  const playStreakBonus = playStreak; // +1 per day played
  const winningStreakBonus = winningStreak * 20; // +20 per day won
  const totalBonuses = playStreakBonus + winningStreakBonus;
  
  const winningMessage = getWinningStreakMessage(winningStreak);
  const playMessage = getPlayStreakMessage(playStreak);

  let message = `Score: +${totalPoints} points`;
  
  // Show detailed breakdown
  if (totalBonuses > 0) {
    message += ` (${basePoints} base`;
    if (winningStreakBonus > 0) {
      message += ` + ${winningStreakBonus} winning`;
    }
    if (playStreakBonus > 0) {
      message += ` + ${playStreakBonus} play`;
    }
    message += `!)`;
    
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
    streakBonus: totalBonuses,
    message
  };
}

/**
 * Preview of points at different winning streak levels for documentation/testing
 */
export function getWinningStreakPreview(): { winningStreak: number, points: number }[] {
  const preview = [];
  
  // Sample key winning streak milestones (linear system is simpler!)
  const milestones = [1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30, 50];
  
  for (const winningStreak of milestones) {
    preview.push({
      winningStreak,
      points: calculatePoints(true, winningStreak, winningStreak) // Assume play streak = winning streak for preview
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

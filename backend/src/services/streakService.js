/**
 * Calculate streak updates based on the last active date.
 * 
 * Rules:
 * - If lastActiveDate is today: streak unchanged
 * - If lastActiveDate is yesterday: streak incremented
 * - If lastActiveDate is older: streak reset to 1
 * - If no lastActiveDate: streak set to 1
 */
function calculateStreak(currentStreak, longestStreak, lastActiveDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!lastActiveDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastActiveDate: today,
      streakChanged: true,
    };
  }
  
  const lastActive = new Date(lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);
  
  const diffMs = today.getTime() - lastActive.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Already active today, no streak change
    return {
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      streakChanged: false,
    };
  }
  
  if (diffDays === 1) {
    // Yesterday — extend streak
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastActiveDate: today,
      streakChanged: true,
    };
  }
  
  // More than 1 day gap — reset streak
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
    lastActiveDate: today,
    streakChanged: true,
  };
}

module.exports = { calculateStreak };

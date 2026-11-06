/** How many voxels of an N-voxel tree are visible at a given progress (0..1). */
export function visibleCount(progress: number, total: number): number {
  if (!(progress > 0)) return 0;
  if (progress >= 1) return total;
  return Math.min(total, Math.floor(progress * total));
}

/** Streak length -> how far leaves have shifted toward autumn gold (0 = green, 1 = gold). */
export function autumnFactor(streakDays: number, fullStreak: number): number {
  if (!(streakDays > 0) || !(fullStreak > 0)) return 0;
  return Math.min(1, streakDays / fullStreak);
}

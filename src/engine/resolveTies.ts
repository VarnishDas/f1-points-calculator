/**
 * Tie-breaking for championship standings using F1 countback rules.
 * When points are equal, the driver with the most 1st places ranks higher;
 * if still equal, the most 2nd places, then 3rd, and so on.
 */
export interface DriverPointsEntry {
  driverId: string;
  points: number;
  /**
   * Finishing-position counts. Index 0 = count of 1st places,
   * index 1 = count of 2nd places, etc.
   */
  positionCounts: number[];
}

/**
 * Sort driver entries by points descending, breaking ties via countback.
 * Returns a new array; the input is not mutated.
 */
export function resolveTies(entries: DriverPointsEntry[]): DriverPointsEntry[] {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const maxLen = Math.max(a.positionCounts.length, b.positionCounts.length);
    for (let i = 0; i < maxLen; i++) {
      const aCount = a.positionCounts[i] ?? 0;
      const bCount = b.positionCounts[i] ?? 0;
      if (bCount !== aCount) return bCount - aCount;
    }
    return 0;
  });
}

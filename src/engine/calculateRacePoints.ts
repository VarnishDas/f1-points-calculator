/**
 * F1 2026 Grand Prix points system.
 * Only normal Grand Prix points are implemented here.
 * Fastest lap and sprint points are intentionally deferred.
 */
export const POINTS_TABLE: readonly number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

/**
 * Points awarded for a 1-indexed finishing position.
 * Positions 11+ score 0. Invalid positions (<= 0) score 0.
 */
export function getPointsForPosition(position: number): number {
  if (!Number.isInteger(position) || position < 1) return 0;
  if (position > POINTS_TABLE.length) return 0;
  return POINTS_TABLE[position - 1];
}

/**
 * Calculate points for a single race result.
 * `result` is an ordered array of driver IDs from 1st to last.
 * Returns a map of driverId -> points awarded in this race.
 * A null result (e.g. an upcoming race) yields an empty map.
 */
export function calculateRacePoints(result: string[] | null): Record<string, number> {
  const points: Record<string, number> = {};
  if (!result) return points;
  result.forEach((driverId, index) => {
    points[driverId] = getPointsForPosition(index + 1);
  });
  return points;
}

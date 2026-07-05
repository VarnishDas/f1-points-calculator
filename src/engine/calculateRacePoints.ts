import type { EventResultEntry } from "../types/race";

/**
 * F1 2026 Grand Prix points system.
 * Fastest lap points are intentionally not modeled.
 */
export const POINTS_TABLE: readonly number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS_TABLE: readonly number[] = [8, 7, 6, 5, 4, 3, 2, 1];

export type PointsSession = "grandPrix" | "sprint";

/**
 * Points awarded for a 1-indexed finishing position.
 * Positions 11+ score 0. Invalid positions (<= 0) score 0.
 */
export function getPointsForPosition(position: number): number {
  return getPointsForSessionPosition(position, "grandPrix");
}

export function getSprintPointsForPosition(position: number): number {
  return getPointsForSessionPosition(position, "sprint");
}

export function getPointsForSessionPosition(
  position: number,
  session: PointsSession,
): number {
  if (!Number.isInteger(position) || position < 1) return 0;
  const table = session === "sprint" ? SPRINT_POINTS_TABLE : POINTS_TABLE;
  if (position > table.length) return 0;
  return table[position - 1];
}

/**
 * Calculate points for a single race result.
 * `result` is an ordered array of driver IDs from 1st to last.
 * Returns a map of driverId -> points awarded in this race.
 * A null result (e.g. an upcoming race) yields an empty map.
 */
export function calculateRacePoints(
  result: readonly string[] | readonly EventResultEntry[] | null,
  session: PointsSession = "grandPrix",
): Record<string, number> {
  const points: Record<string, number> = {};
  if (!result) return points;
  result.forEach((entry, index) => {
    const driverId = typeof entry === "string" ? entry : entry.driverId;
    const position = typeof entry === "string" ? index + 1 : entry.position;
    points[driverId] = getPointsForSessionPosition(position, session);
  });
  return points;
}

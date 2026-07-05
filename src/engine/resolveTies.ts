/**
 * Shared championship ordering for F1 countback rules.
 *
 * The FIA 2026 championship tie-break first compares points, then the number
 * of race 1st places, race 2nd places, race 3rd places, and so on. If race
 * countback cannot separate entries, this app only uses fallbackOrder to keep
 * rendering stable; it is not an FIA deciding criterion.
 */
export interface ChampionshipCountbackEntry {
  points: number;
  /**
   * Finishing-position counts. Index 0 = count of 1st places,
   * index 1 = count of 2nd places, etc.
   */
  positionCounts: readonly number[];
  fallbackOrder?: number;
}

export type ChampionshipComparison = -1 | 0 | 1;

/**
 * Compare two entries by points and race countback only.
 * Returns 1 when `a` is ahead, -1 when `b` is ahead, and 0 when the available
 * race countback data cannot separate them.
 */
export function compareChampionshipPerformance(
  a: ChampionshipCountbackEntry,
  b: ChampionshipCountbackEntry,
): ChampionshipComparison {
  if (a.points !== b.points) return a.points > b.points ? 1 : -1;

  const maxLen = Math.max(a.positionCounts.length, b.positionCounts.length);
  for (let i = 0; i < maxLen; i++) {
    const aCount = a.positionCounts[i] ?? 0;
    const bCount = b.positionCounts[i] ?? 0;
    if (aCount !== bCount) return aCount > bCount ? 1 : -1;
  }

  return 0;
}

/**
 * Sort entries by championship order. Returns a new array; the input is not
 * mutated. The final fallback is deterministic app ordering only.
 */
export function resolveChampionshipOrder<T extends ChampionshipCountbackEntry>(
  entries: readonly T[],
): T[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const comparison = compareChampionshipPerformance(a.entry, b.entry);
      if (comparison !== 0) return comparison === 1 ? -1 : 1;

      const aFallback = a.entry.fallbackOrder ?? a.index;
      const bFallback = b.entry.fallbackOrder ?? b.index;
      return aFallback - bFallback;
    })
    .map(({ entry }) => entry);
}

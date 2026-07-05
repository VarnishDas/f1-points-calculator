import {
  MAX_CLASSIFICATION_POSITIONS,
  MIN_CLASSIFICATION_POSITIONS,
} from "../config/season";
import type { EventResultEntry, Race } from "../types/race";

function resultLength(result: readonly EventResultEntry[] | null | undefined): number {
  if (!result?.length) return 0;
  return Math.max(...result.map((entry) => entry.position));
}

export function getClassificationSize(races: readonly Race[]): number {
  const size = Math.max(
    MIN_CLASSIFICATION_POSITIONS,
    ...races.map((race) =>
      Math.max(resultLength(race.grandPrixResult), resultLength(race.sprintResult)),
    ),
  );
  return Math.min(size, MAX_CLASSIFICATION_POSITIONS);
}

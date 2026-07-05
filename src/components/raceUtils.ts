import type { Race } from "../types/race";

export function sortRacesByRound(races: Race[]): Race[] {
  return [...races].sort((a, b) => a.round - b.round);
}

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import type { StandingsResult } from "./standingsAggregation";

import { calculateStandingsForMode } from "./standingsAggregation";

/**
 * Projected ("what-if") standings.
 *
 * Includes every race that currently has a result:
 *   - completed races (official results)
 *   - upcoming races where the user has made a prediction (non-null result)
 *
 * Upcoming races with no prediction (`result === null`) are ignored, so
 * before any predictions are made this is equivalent to `calculateStandings`.
 * Tie-breaking uses the same F1 countback rules as the official standings.
 */
export function calculateProjectedStandings(
  races: Race[],
  drivers: Driver[],
  teams: Team[],
): StandingsResult {
  return calculateStandingsForMode(races, drivers, teams, "completedAndPredicted");
}

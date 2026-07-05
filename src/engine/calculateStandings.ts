import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import type { StandingsResult } from "./standingsAggregation";

import { calculateStandingsForMode } from "./standingsAggregation";

/**
 * Aggregate completed race results into driver and constructor standings.
 * Only races with `status: "completed"` and a non-null `result` contribute.
 * Ties are broken via F1 race countback for both drivers and constructors.
 */
export function calculateStandings(
  races: Race[],
  drivers: Driver[],
  teams: Team[],
): StandingsResult {
  return calculateStandingsForMode(races, drivers, teams, "completedOnly");
}

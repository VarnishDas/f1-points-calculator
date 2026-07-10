import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import type { StandingsResult } from "./standingsAggregation";

import { calculateStandingsForMode } from "./standingsAggregation";

/**
 * Aggregate official GP and Sprint results into driver and constructor standings.
 * This includes a completed Sprint before the Grand Prix on the same weekend.
 * Ties are broken via F1 race countback for both drivers and constructors.
 */
export function calculateStandings(
  races: Race[],
  drivers: Driver[],
  teams: Team[],
): StandingsResult {
  return calculateStandingsForMode(races, drivers, teams, "officialOnly");
}

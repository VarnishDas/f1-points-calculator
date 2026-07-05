import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { DriverPointsEntry } from "./resolveTies";

import { getPointsForPosition } from "./calculateRacePoints";
import { resolveTies } from "./resolveTies";

export interface StandingsResult {
  drivers: DriverStanding[];
  teams: TeamStanding[];
}

/**
 * Aggregate completed race results into driver and constructor standings.
 * Only races with `status: "completed"` and a non-null `result` contribute.
 * Driver ties are broken via F1 countback (more wins, then 2nds, then 3rds...).
 * Team ties are broken by total points only.
 */
export function calculateStandings(
  races: Race[],
  drivers: Driver[],
  teams: Team[],
): StandingsResult {
  const driverToTeam = new Map<string, string>();
  for (const driver of drivers) driverToTeam.set(driver.id, driver.teamId);

  const driverTotalPoints = new Map<string, number>();
  const driverPositionCounts = new Map<string, number[]>();
  const teamTotalPoints = new Map<string, number>();

  for (const race of races) {
    if (race.status !== "completed" || !race.result) continue;

    race.result.forEach((driverId, index) => {
      const position = index + 1;
      const pts = getPointsForPosition(position);

      driverTotalPoints.set(driverId, (driverTotalPoints.get(driverId) ?? 0) + pts);

      let counts = driverPositionCounts.get(driverId);
      if (!counts) {
        counts = [];
        driverPositionCounts.set(driverId, counts);
      }
      counts[position - 1] = (counts[position - 1] ?? 0) + 1;

      const teamId = driverToTeam.get(driverId);
      if (teamId !== undefined) {
        teamTotalPoints.set(teamId, (teamTotalPoints.get(teamId) ?? 0) + pts);
      }
    });
  }

  const driverEntries: DriverPointsEntry[] = drivers.map((driver) => ({
    driverId: driver.id,
    points: driverTotalPoints.get(driver.id) ?? 0,
    positionCounts: driverPositionCounts.get(driver.id) ?? [],
  }));

  const sortedDrivers = resolveTies(driverEntries);

  const driverStandings: DriverStanding[] = sortedDrivers.map((entry, index) => ({
    driverId: entry.driverId,
    position: index + 1,
    points: entry.points,
    wins: entry.positionCounts[0] ?? 0,
  }));

  const teamEntries = teams
    .map((team) => ({
      teamId: team.id,
      points: teamTotalPoints.get(team.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const teamStandings: TeamStanding[] = teamEntries.map((entry, index) => ({
    teamId: entry.teamId,
    position: index + 1,
    points: entry.points,
  }));

  return { drivers: driverStandings, teams: teamStandings };
}

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { DriverPointsEntry } from "./resolveTies";
import type { StandingsResult } from "./calculateStandings";

import { getPointsForPosition } from "./calculateRacePoints";
import { resolveTies } from "./resolveTies";

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
  const driverToTeam = new Map<string, string>();
  for (const driver of drivers) driverToTeam.set(driver.id, driver.teamId);

  const driverTotalPoints = new Map<string, number>();
  const driverPositionCounts = new Map<string, number[]>();
  const teamTotalPoints = new Map<string, number>();

  for (const race of races) {
    if (!race.result) continue;

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

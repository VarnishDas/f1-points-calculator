import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { DriverStanding, TeamStanding } from "../types/standings";

/**
 * Aggregate driver standings into constructor standings.
 * Driver points are summed per team; every team is included even with 0 points.
 * Teams are sorted by total points descending and assigned sequential positions.
 */
export function calculateTeamStandings(
  driverStandings: DriverStanding[],
  drivers: Driver[],
  teams: Team[],
): TeamStanding[] {
  const driverToTeam = new Map<string, string>();
  for (const driver of drivers) driverToTeam.set(driver.id, driver.teamId);

  const teamPoints = new Map<string, number>();
  for (const team of teams) teamPoints.set(team.id, 0);

  for (const standing of driverStandings) {
    const teamId = driverToTeam.get(standing.driverId);
    if (teamId === undefined) continue;
    teamPoints.set(teamId, (teamPoints.get(teamId) ?? 0) + standing.points);
  }

  return teams
    .map((team) => ({
      teamId: team.id,
      points: teamPoints.get(team.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({
      teamId: entry.teamId,
      position: index + 1,
      points: entry.points,
    }));
}

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { Team } from "../types/team";
import type { ChampionshipCountbackEntry } from "./resolveTies";

import { getPointsForPosition } from "./calculateRacePoints";
import { resolveChampionshipOrder } from "./resolveTies";

export type StandingsRaceMode = "completedOnly" | "completedAndPredicted";

export interface DriverChampionshipEntry extends ChampionshipCountbackEntry {
  driverId: string;
  positionCounts: number[];
}

export interface TeamChampionshipEntry extends ChampionshipCountbackEntry {
  teamId: string;
  positionCounts: number[];
}

export interface ChampionshipEntries {
  drivers: DriverChampionshipEntry[];
  teams: TeamChampionshipEntry[];
}

export interface StandingsResult {
  drivers: DriverStanding[];
  teams: TeamStanding[];
}

function shouldUseRace(race: Race, mode: StandingsRaceMode): boolean {
  if (!race.result) return false;
  if (mode === "completedAndPredicted") return true;
  return race.status === "completed";
}

function incrementPositionCount(counts: number[], position: number): void {
  counts[position - 1] = (counts[position - 1] ?? 0) + 1;
}

export function aggregateChampionshipEntries(
  races: readonly Race[],
  drivers: readonly Driver[],
  teams: readonly Team[],
  mode: StandingsRaceMode,
): ChampionshipEntries {
  const driverToTeam = new Map<string, string>();
  for (const driver of drivers) driverToTeam.set(driver.id, driver.teamId);

  const driverTotalPoints = new Map<string, number>();
  const driverPositionCounts = new Map<string, number[]>();
  const teamTotalPoints = new Map<string, number>();
  const teamPositionCounts = new Map<string, number[]>();

  for (const race of races) {
    if (!shouldUseRace(race, mode)) continue;

    race.result?.forEach((driverId, index) => {
      if (!driverId || !driverToTeam.has(driverId)) return;

      const position = index + 1;
      const points = getPointsForPosition(position);

      driverTotalPoints.set(
        driverId,
        (driverTotalPoints.get(driverId) ?? 0) + points,
      );

      let driverCounts = driverPositionCounts.get(driverId);
      if (!driverCounts) {
        driverCounts = [];
        driverPositionCounts.set(driverId, driverCounts);
      }
      incrementPositionCount(driverCounts, position);

      const teamId = driverToTeam.get(driverId);
      if (teamId === undefined) return;

      teamTotalPoints.set(teamId, (teamTotalPoints.get(teamId) ?? 0) + points);

      let teamCounts = teamPositionCounts.get(teamId);
      if (!teamCounts) {
        teamCounts = [];
        teamPositionCounts.set(teamId, teamCounts);
      }
      incrementPositionCount(teamCounts, position);
    });
  }

  return {
    drivers: drivers.map((driver, index) => ({
      driverId: driver.id,
      points: driverTotalPoints.get(driver.id) ?? 0,
      positionCounts: driverPositionCounts.get(driver.id) ?? [],
      fallbackOrder: index,
    })),
    teams: teams.map((team, index) => ({
      teamId: team.id,
      points: teamTotalPoints.get(team.id) ?? 0,
      positionCounts: teamPositionCounts.get(team.id) ?? [],
      fallbackOrder: index,
    })),
  };
}

export function buildStandings(entries: ChampionshipEntries): StandingsResult {
  const sortedDrivers = resolveChampionshipOrder(entries.drivers);
  const sortedTeams = resolveChampionshipOrder(entries.teams);

  return {
    drivers: sortedDrivers.map((entry, index) => ({
      driverId: entry.driverId,
      position: index + 1,
      points: entry.points,
      wins: entry.positionCounts[0] ?? 0,
    })),
    teams: sortedTeams.map((entry, index) => ({
      teamId: entry.teamId,
      position: index + 1,
      points: entry.points,
    })),
  };
}

export function calculateStandingsForMode(
  races: readonly Race[],
  drivers: readonly Driver[],
  teams: readonly Team[],
  mode: StandingsRaceMode,
): StandingsResult {
  return buildStandings(aggregateChampionshipEntries(races, drivers, teams, mode));
}

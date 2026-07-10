import type { Driver } from "../types/driver";
import type { EventResultEntry, Race } from "../types/race";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { Team } from "../types/team";
import type { ChampionshipCountbackEntry } from "./resolveTies";

import { getPointsForSessionPosition, type PointsSession } from "./calculateRacePoints";
import { resolveChampionshipOrder } from "./resolveTies";
import { isPredictionSessionEditable } from "../utils/predictionSession";

export type StandingsRaceMode = "officialOnly" | "officialAndPredicted";

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

function incrementPositionCount(counts: number[], position: number): void {
  counts[position - 1] = (counts[position - 1] ?? 0) + 1;
}

function addClassificationEntry(
  driverId: string,
  teamId: string | undefined,
  position: number,
  points: number,
  driverTotalPoints: Map<string, number>,
  driverPositionCounts: Map<string, number[]>,
  teamTotalPoints: Map<string, number>,
  teamPositionCounts: Map<string, number[]>,
  countsForChampionshipTiebreak: boolean,
): void {
  if (!driverId || !Number.isInteger(position) || position < 1) return;

  driverTotalPoints.set(
    driverId,
    (driverTotalPoints.get(driverId) ?? 0) + points,
  );

  if (countsForChampionshipTiebreak) {
    let driverCounts = driverPositionCounts.get(driverId);
    if (!driverCounts) {
      driverCounts = [];
      driverPositionCounts.set(driverId, driverCounts);
    }
    incrementPositionCount(driverCounts, position);
  }

  if (!teamId) return;

  teamTotalPoints.set(teamId, (teamTotalPoints.get(teamId) ?? 0) + points);

  if (countsForChampionshipTiebreak) {
    let teamCounts = teamPositionCounts.get(teamId);
    if (!teamCounts) {
      teamCounts = [];
      teamPositionCounts.set(teamId, teamCounts);
    }
    incrementPositionCount(teamCounts, position);
  }
}

function addOfficialResult(
  result: readonly EventResultEntry[] | null | undefined,
  session: PointsSession,
  driverTotalPoints: Map<string, number>,
  driverPositionCounts: Map<string, number[]>,
  teamTotalPoints: Map<string, number>,
  teamPositionCounts: Map<string, number[]>,
): void {
  if (!result) return;

  for (const entry of result) {
    addClassificationEntry(
      entry.driverId,
      entry.teamId,
      entry.position,
      entry.points ?? getPointsForSessionPosition(entry.position, session),
      driverTotalPoints,
      driverPositionCounts,
      teamTotalPoints,
      teamPositionCounts,
      session === "grandPrix",
    );
  }
}

function addPredictionResult(
  prediction: readonly string[] | null,
  session: PointsSession,
  driverToTeam: ReadonlyMap<string, string>,
  driverTotalPoints: Map<string, number>,
  driverPositionCounts: Map<string, number[]>,
  teamTotalPoints: Map<string, number>,
  teamPositionCounts: Map<string, number[]>,
): void {
  if (!prediction) return;

  prediction.forEach((driverId, index) => {
    if (!driverId || !driverToTeam.has(driverId)) return;
    const position = index + 1;
    addClassificationEntry(
      driverId,
      driverToTeam.get(driverId),
      position,
      getPointsForSessionPosition(position, session),
      driverTotalPoints,
      driverPositionCounts,
      teamTotalPoints,
      teamPositionCounts,
      session === "grandPrix",
    );
  });
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
    addOfficialResult(
      race.grandPrixResult,
      "grandPrix",
      driverTotalPoints,
      driverPositionCounts,
      teamTotalPoints,
      teamPositionCounts,
    );
    addOfficialResult(
      race.sprintResult,
      "sprint",
      driverTotalPoints,
      driverPositionCounts,
      teamTotalPoints,
      teamPositionCounts,
    );

    if (mode === "officialAndPredicted") {
      if (isPredictionSessionEditable(race, "grandPrix")) {
        addPredictionResult(
          race.prediction,
          "grandPrix",
          driverToTeam,
          driverTotalPoints,
          driverPositionCounts,
          teamTotalPoints,
          teamPositionCounts,
        );
      }
      if (isPredictionSessionEditable(race, "sprint")) {
        addPredictionResult(
          race.sprintPrediction,
          "sprint",
          driverToTeam,
          driverTotalPoints,
          driverPositionCounts,
          teamTotalPoints,
          teamPositionCounts,
        );
      }
    }
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

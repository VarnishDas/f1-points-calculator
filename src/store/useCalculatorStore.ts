import { create } from "zustand";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { Race } from "../types/race";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { ScenarioPredictions } from "../utils/encodeScenario";

import { drivers as initialDrivers, races as initialRaces, teams as initialTeams } from "../data";
import { calculateStandings } from "../engine/calculateStandings";

export interface CalculatorState {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  updatePrediction: (raceId: string, orderedDriverIds: string[]) => void;
  clearPredictionPosition: (raceId: string, positionIndex: number) => void;
  applyScenario: (predictions: ScenarioPredictions) => void;
  resetPredictions: () => void;
}

/**
 * Copy the imported race data so the store never mutates the JSON module
 * in place. Result arrays are cloned to keep them independent.
 */
function cloneRaces(races: Race[]): Race[] {
  return races.map((race) => ({
    ...race,
    result: race.result ? race.result.slice() : null,
  }));
}

export const useCalculatorStore = create<CalculatorState>()((set) => ({
  races: cloneRaces(initialRaces),
  drivers: initialDrivers,
  teams: initialTeams,

  updatePrediction: (raceId, orderedDriverIds) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || race.status !== "upcoming") return state;
      return {
        races: state.races.map((r) =>
          r.id === raceId ? { ...r, result: orderedDriverIds.slice() } : r,
        ),
      };
    }),

  clearPredictionPosition: (raceId, positionIndex) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || race.status !== "upcoming" || !race.result) return state;

      const nextResult = race.result.slice();
      delete nextResult[positionIndex];
      while (nextResult.length > 0 && nextResult[nextResult.length - 1] === undefined) {
        nextResult.length -= 1;
      }

      return {
        races: state.races.map((r) =>
          r.id === raceId ? { ...r, result: nextResult.length ? nextResult : null } : r,
        ),
      };
    }),

  applyScenario: (predictions) =>
    set((state) => ({
      races: state.races.map((race) => {
        if (race.status !== "upcoming") return race;

        const entries = predictions[race.id];
        if (!entries || entries.length === 0) {
          return { ...race, result: null };
        }

        const nextResult: string[] = [];
        for (const entry of entries) {
          nextResult[entry.p - 1] = entry.d;
        }
        while (nextResult.length > 0 && nextResult[nextResult.length - 1] === undefined) {
          nextResult.length -= 1;
        }

        return { ...race, result: nextResult.length ? nextResult : null };
      }),
    })),

  resetPredictions: () =>
    set((state) => ({
      races: state.races.map((r) =>
        r.status === "upcoming" ? { ...r, result: null } : r,
      ),
    })),
}));

/**
 * Selectors keep the store as the single source of truth for computed
 * standings. They derive driver/constructor standings from current state.
 */
export function selectDriverStandings(state: CalculatorState): DriverStanding[] {
  return calculateStandings(state.races, state.drivers, state.teams).drivers;
}

export function selectTeamStandings(state: CalculatorState): TeamStanding[] {
  return calculateStandings(state.races, state.drivers, state.teams).teams;
}

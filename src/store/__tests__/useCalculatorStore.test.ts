import { describe, it, expect, beforeEach } from "vitest";
import {
  selectDriverStandings,
  selectTeamStandings,
  useCalculatorStore,
} from "../useCalculatorStore";
import { calculateStandings } from "../../engine/calculateStandings";
import { drivers as staticDrivers, races as staticRaces, teams as staticTeams } from "../../data";
import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import type { ScenarioPredictionsBySession } from "../../utils/encodeScenario";

describe("useCalculatorStore", () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetPredictions();
  });

  it("initializes from the static JSON data without mutating it", () => {
    const { races } = useCalculatorStore.getState();
    expect(races).toHaveLength(staticRaces.length);
    expect(useCalculatorStore.getState().drivers).toEqual(staticDrivers);
    expect(useCalculatorStore.getState().teams).toEqual(staticTeams);
    // Imported JSON official result arrays must remain untouched.
    staticRaces.forEach((race) => {
      const storeRace = races.find((r) => r.id === race.id);
      expect(storeRace).not.toBe(race);
      if (race.grandPrixResult) {
        expect(storeRace?.grandPrixResult).not.toBe(race.grandPrixResult);
      }
      if (race.sprintResult) expect(storeRace?.sprintResult).not.toBe(race.sprintResult);
      if (race.prediction) expect(storeRace?.prediction).not.toBe(race.prediction);
      if (race.sprintPrediction) expect(storeRace?.sprintPrediction).not.toBe(race.sprintPrediction);
    });
  });

  it("updatePrediction replaces the prediction of an upcoming race", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcoming.id, "grandPrix", ["norris", "piastri", "verstappen"]);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toEqual(["norris", "piastri", "verstappen"]);
  });

  it("updatePrediction preserves empty prediction slots for arbitrary positions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const prediction: string[] = [];
    prediction[4] = "norris";
    useCalculatorStore.getState().updatePrediction(upcoming.id, "grandPrix", prediction);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(5);
    expect(updated?.prediction?.[0]).toBeUndefined();
    expect(updated?.prediction?.[4]).toBe("norris");
  });

  it("updatePrediction preserves all configured classified finishing positions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const prediction: string[] = [];
    prediction[RACE_CLASSIFICATION_SIZE - 1] = "norris";
    useCalculatorStore.getState().updatePrediction(upcoming.id, "grandPrix", prediction);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(RACE_CLASSIFICATION_SIZE);
    expect(updated?.prediction?.[RACE_CLASSIFICATION_SIZE - 1]).toBe("norris");
  });

  it("updatePrediction does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    useCalculatorStore.getState().updatePrediction(completed.id, "grandPrix", ["norris", "piastri"]);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("updatePrediction leaves state unchanged for an unknown race id", () => {
    const before = useCalculatorStore.getState();
    useCalculatorStore.getState().updatePrediction("does-not-exist", "grandPrix", ["norris"]);
    expect(useCalculatorStore.getState()).toBe(before);
  });

  it("clearPredictionPosition removes one driver from an upcoming race", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcoming.id, "grandPrix", ["norris", "piastri", "verstappen"]);
    useCalculatorStore.getState().clearPredictionPosition(upcoming.id, "grandPrix", 1);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(3);
    expect(updated?.prediction?.[0]).toBe("norris");
    expect(updated?.prediction?.[1]).toBeUndefined();
    expect(updated?.prediction?.[2]).toBe("verstappen");
  });

  it("clearPredictionPosition resets an upcoming race to null when no positions remain", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore.getState().updatePrediction(upcoming.id, "grandPrix", ["norris"]);
    useCalculatorStore.getState().clearPredictionPosition(upcoming.id, "grandPrix", 0);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toBeNull();
  });

  it("clearPredictionPosition does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    useCalculatorStore.getState().clearPredictionPosition(completed.id, "grandPrix", 0);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("resetPredictions clears upcoming race predictions but preserves completed results", () => {
    const state = useCalculatorStore.getState();
    const upcoming = state.races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");
    state.updatePrediction(upcoming.id, "grandPrix", ["norris", "piastri", "verstappen"]);

    useCalculatorStore.getState().resetPredictions();

    const after = useCalculatorStore.getState().races;
    after.forEach((r) => {
      if (r.status === "upcoming") {
        expect(r.prediction).toBeNull();
        expect(r.sprintPrediction).toBeNull();
      }
    });
    const completedWithResults = after.filter(
      (r) => r.status === "completed" && r.grandPrixResult,
    );
    expect(completedWithResults.length).toBeGreaterThan(0);
  });

  it("selectDriverStandings matches calculateStandings on the store's races", () => {
    const state = useCalculatorStore.getState();
    const expected = calculateStandings(state.races, state.drivers, state.teams).drivers;
    expect(selectDriverStandings(state)).toEqual(expected);
  });
});

describe("sprint weekend predictions", () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetPredictions();
  });

  it("updatePrediction stores a GP prediction on an upcoming sprint weekend", () => {
    const upcomingSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && r.hasSprint);
    if (!upcomingSprint) throw new Error("expected an upcoming sprint race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcomingSprint.id, "grandPrix", ["norris", "piastri", "verstappen"]);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingSprint.id);
    expect(updated?.prediction).toEqual(["norris", "piastri", "verstappen"]);
    expect(updated?.sprintResult).toBeNull();
  });

  it("updatePrediction stores a sprint prediction on an upcoming sprint weekend", () => {
    const upcomingSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && r.hasSprint);
    if (!upcomingSprint) throw new Error("expected an upcoming sprint race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcomingSprint.id, "sprint", ["norris", "piastri", "verstappen"]);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingSprint.id);
    expect(updated?.sprintPrediction).toEqual(["norris", "piastri", "verstappen"]);
    expect(updated?.prediction).toBeNull();
  });

  it("updatePrediction does not store a sprint prediction on a non-sprint weekend", () => {
    const upcomingNonSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && !r.hasSprint);
    if (!upcomingNonSprint) throw new Error("expected an upcoming non-sprint race");

    const before = useCalculatorStore.getState();
    useCalculatorStore.getState().updatePrediction(upcomingNonSprint.id, "sprint", ["norris"]);

    expect(useCalculatorStore.getState()).toBe(before);
  });

  it("clearPredictionPosition removes the correct GP slot on a sprint weekend", () => {
    const upcomingSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && r.hasSprint);
    if (!upcomingSprint) throw new Error("expected an upcoming sprint race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcomingSprint.id, "grandPrix", ["norris", "piastri", "verstappen"]);
    useCalculatorStore.getState().clearPredictionPosition(upcomingSprint.id, "grandPrix", 1);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingSprint.id);
    expect(updated?.prediction).toHaveLength(3);
    expect(updated?.prediction?.[0]).toBe("norris");
    expect(updated?.prediction?.[1]).toBeUndefined();
    expect(updated?.prediction?.[2]).toBe("verstappen");
  });

  it("clearPredictionPosition removes the correct sprint slot on a sprint weekend", () => {
    const upcomingSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && r.hasSprint);
    if (!upcomingSprint) throw new Error("expected an upcoming sprint race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcomingSprint.id, "sprint", ["norris", "piastri", "verstappen"]);
    useCalculatorStore.getState().clearPredictionPosition(upcomingSprint.id, "sprint", 1);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingSprint.id);
    expect(updated?.sprintPrediction).toHaveLength(3);
    expect(updated?.sprintPrediction?.[0]).toBe("norris");
    expect(updated?.sprintPrediction?.[1]).toBeUndefined();
    expect(updated?.sprintPrediction?.[2]).toBe("verstappen");
  });

  it("does not modify the official sprint result when predicting the GP", () => {
    const completedSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed" && r.sprintResult?.length);
    if (!completedSprint) throw new Error("expected a completed sprint race");
    const originalSprintResult = completedSprint.sprintResult?.map((entry) => ({
      ...entry,
    }));

    useCalculatorStore
      .getState()
      .updatePrediction(completedSprint.id, "grandPrix", ["norris", "piastri"]);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completedSprint.id);
    expect(after?.sprintResult).toEqual(originalSprintResult);
  });

  it("does not modify the official sprint result when predicting the sprint", () => {
    const completedSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed" && r.sprintResult?.length);
    if (!completedSprint) throw new Error("expected a completed sprint race");
    const originalSprintResult = completedSprint.sprintResult?.map((entry) => ({
      ...entry,
    }));

    useCalculatorStore
      .getState()
      .updatePrediction(completedSprint.id, "sprint", ["norris", "piastri"]);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completedSprint.id);
    expect(after?.sprintResult).toEqual(originalSprintResult);
    expect(after?.sprintPrediction).toBeNull();
  });
});

describe("selectTeamStandings", () => {
  it("returns a sorted TeamStanding[] for all generated teams", () => {
    const state = useCalculatorStore.getState();
    const teamStandings = selectTeamStandings(state);
    const points = teamStandings.map((t) => t.points);
    expect(teamStandings).toHaveLength(state.teams.length);
    expect(points).toEqual([...points].sort((a, b) => b - a));
    teamStandings.forEach((row, index) => {
      expect(row.position).toBe(index + 1);
    });
  });

  it("produces non-negative constructor points", () => {
    const state = useCalculatorStore.getState();
    const teamStandings = selectTeamStandings(state);
    expect(teamStandings.every((standing) => standing.points >= 0)).toBe(true);
  });

  it("matches the team standings produced by calculateStandings", () => {
    const state = useCalculatorStore.getState();
    const expected = calculateStandings(state.races, state.drivers, state.teams).teams;
    expect(selectTeamStandings(state)).toEqual(expected);
  });
});

describe("applyScenario", () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetPredictions();
  });

  it("applies decoded predictions to upcoming races", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const scenario: ScenarioPredictionsBySession = {
      predictions: {
        [upcoming.id]: [
          { p: 1, d: "norris" },
          { p: 2, d: "piastri" },
          { p: 3, d: "verstappen" },
        ],
      },
      sprintPredictions: {},
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toEqual(["norris", "piastri", "verstappen"]);
  });

  it("preserves empty gaps when applying sparse predictions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const scenario: ScenarioPredictionsBySession = {
      predictions: {
        [upcoming.id]: [{ p: 5, d: "norris" }],
      },
      sprintPredictions: {},
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(5);
    expect(updated?.prediction?.[0]).toBeUndefined();
    expect(updated?.prediction?.[4]).toBe("norris");
  });

  it("clears unrelated upcoming races so the scenario is authoritative", () => {
    const races = useCalculatorStore.getState().races;
    const firstUpcoming = races.find((r) => r.status === "upcoming");
    const secondUpcoming = races.find((r) => r.status === "upcoming" && r.id !== firstUpcoming?.id);
    if (!firstUpcoming || !secondUpcoming) throw new Error("expected at least two upcoming races");

    useCalculatorStore
      .getState()
      .updatePrediction(secondUpcoming.id, "grandPrix", ["norris", "piastri"]);

    const scenario: ScenarioPredictionsBySession = {
      predictions: {
        [firstUpcoming.id]: [{ p: 1, d: "verstappen" }],
      },
      sprintPredictions: {},
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const first = useCalculatorStore.getState().races.find((r) => r.id === firstUpcoming.id);
    const second = useCalculatorStore.getState().races.find((r) => r.id === secondUpcoming.id);
    expect(first?.prediction).toEqual(["verstappen"]);
    expect(second?.prediction).toBeNull();
  });

  it("does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    const scenario: ScenarioPredictionsBySession = {
      predictions: {
        [completed.id]: [{ p: 1, d: "norris" }],
      },
      sprintPredictions: {},
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("resets all upcoming races when given an empty scenario", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore.getState().updatePrediction(upcoming.id, "grandPrix", ["norris", "piastri"]);

    useCalculatorStore.getState().applyScenario({ predictions: {}, sprintPredictions: {} });

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(after?.prediction).toBeNull();
  });

  it("supports the maximum classified finishing position", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const scenario: ScenarioPredictionsBySession = {
      predictions: {
        [upcoming.id]: [{ p: RACE_CLASSIFICATION_SIZE, d: "norris" }],
      },
      sprintPredictions: {},
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(RACE_CLASSIFICATION_SIZE);
    expect(updated?.prediction?.[RACE_CLASSIFICATION_SIZE - 1]).toBe("norris");
  });

  it("applies sprint predictions to upcoming sprint races", () => {
    const upcomingSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && r.hasSprint);
    if (!upcomingSprint) throw new Error("expected an upcoming sprint race");

    const scenario: ScenarioPredictionsBySession = {
      predictions: {},
      sprintPredictions: {
        [upcomingSprint.id]: [
          { p: 1, d: "norris" },
          { p: 2, d: "piastri" },
        ],
      },
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingSprint.id);
    expect(updated?.sprintPrediction).toEqual(["norris", "piastri"]);
    expect(updated?.prediction).toBeNull();
  });

  it("does not apply sprint predictions to non-sprint races", () => {
    const upcomingNonSprint = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming" && !r.hasSprint);
    if (!upcomingNonSprint) throw new Error("expected an upcoming non-sprint race");

    const scenario: ScenarioPredictionsBySession = {
      predictions: {},
      sprintPredictions: {
        [upcomingNonSprint.id]: [{ p: 1, d: "norris" }],
      },
    };

    useCalculatorStore.getState().applyScenario(scenario);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcomingNonSprint.id);
    expect(updated?.sprintPrediction).toBeNull();
    expect(updated?.prediction).toBeNull();
  });
});

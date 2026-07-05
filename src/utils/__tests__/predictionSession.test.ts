import { describe, expect, it } from "vitest";

import type { PredictionSessionType, Race } from "../../types/race";
import { isPredictionSessionEditable } from "../predictionSession";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "test-2026",
    round: 1,
    name: "Test Grand Prix",
    circuit: "Test Circuit",
    date: "2026-01-01",
    status: "upcoming",
    hasSprint: false,
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
    ...overrides,
  };
}

describe("isPredictionSessionEditable", () => {
  it("allows upcoming Grand Prix predictions", () => {
    expect(isPredictionSessionEditable(makeRace(), "grandPrix")).toBe(true);
  });

  it("blocks completed Grand Prix predictions", () => {
    expect(
      isPredictionSessionEditable(
        makeRace({ status: "completed" }),
        "grandPrix",
      ),
    ).toBe(false);
  });

  it("allows upcoming sprint predictions on sprint weekends", () => {
    expect(
      isPredictionSessionEditable(makeRace({ hasSprint: true }), "sprint"),
    ).toBe(true);
  });

  it("blocks sprint predictions when the sprint result is completed", () => {
    expect(
      isPredictionSessionEditable(
        makeRace({
          hasSprint: true,
          sprintResult: [{ position: 1, driverId: "norris", teamId: "mclaren" }],
        }),
        "sprint",
      ),
    ).toBe(false);
  });

  it.each<PredictionSessionType>(["grandPrix", "sprint"])(
    "blocks %s predictions on completed weekends",
    (session) => {
      expect(
        isPredictionSessionEditable(
          makeRace({ status: "completed", hasSprint: true }),
          session,
        ),
      ).toBe(false);
    },
  );
});

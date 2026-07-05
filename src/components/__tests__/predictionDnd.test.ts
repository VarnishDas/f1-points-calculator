import { describe, expect, it } from "vitest";

import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import {
  getPredictionDroppableId,
  getPredictionDraggableId,
  placeDriverAtPredictionPosition,
} from "../predictionDnd";

describe("getPredictionDroppableId", () => {
  it("produces unique ids for GP and Sprint cells of the same race and position", () => {
    const gpId = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const sprintId = getPredictionDroppableId("chinese-2026", "sprint", 0);

    expect(gpId).not.toBe(sprintId);
    expect(gpId).toBe("cell:chinese-2026:grandPrix:0");
    expect(sprintId).toBe("cell:chinese-2026:sprint:0");
  });

  it("produces unique ids for different positions of the same session", () => {
    const p1 = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const p2 = getPredictionDroppableId("chinese-2026", "grandPrix", 1);

    expect(p1).not.toBe(p2);
  });

  it("produces unique ids for different races", () => {
    const china = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const miami = getPredictionDroppableId("miami-2026", "grandPrix", 0);

    expect(china).not.toBe(miami);
  });
});

describe("getPredictionDraggableId", () => {
  it("produces unique ids for GP and Sprint cells of the same race and driver", () => {
    const gpId = getPredictionDraggableId("chinese-2026", "grandPrix", "norris");
    const sprintId = getPredictionDraggableId("chinese-2026", "sprint", "norris");

    expect(gpId).not.toBe(sprintId);
    expect(gpId).toBe("pick:chinese-2026:grandPrix:norris");
    expect(sprintId).toBe("pick:chinese-2026:sprint:norris");
  });
});

describe("placeDriverAtPredictionPosition", () => {
  it("places a driver directly into a lower empty finishing position", () => {
    const result = placeDriverAtPredictionPosition(null, "norris", 4);

    expect(result).toHaveLength(5);
    expect(result[0]).toBeUndefined();
    expect(result[4]).toBe("norris");
  });

  it("supports the final classified finishing position", () => {
    const result = placeDriverAtPredictionPosition(
      null,
      "norris",
      RACE_CLASSIFICATION_SIZE - 1,
    );

    expect(RACE_CLASSIFICATION_SIZE).toBe(22);
    expect(result).toHaveLength(22);
    expect(result[21]).toBe("norris");
  });

  it("moves an existing driver without compacting empty positions", () => {
    const current: string[] = [];
    current[0] = "norris";

    const result = placeDriverAtPredictionPosition(current, "norris", 6);

    expect(result).toHaveLength(7);
    expect(result[0]).toBeUndefined();
    expect(result[6]).toBe("norris");
  });

  it("trims trailing empty positions after a move", () => {
    const current: string[] = [];
    current[5] = "norris";

    const result = placeDriverAtPredictionPosition(current, "norris", 1);

    expect(result).toHaveLength(2);
    expect(result[1]).toBe("norris");
  });
});

import { describe, expect, it } from "vitest";

import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import { placeDriverAtPredictionPosition } from "../predictionDnd";

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

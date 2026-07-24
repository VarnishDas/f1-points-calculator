import { describe, expect, it, vi } from "vitest";

import type { Race } from "../../types/race";
import {
  buildShareUrl,
  countScenarioPredictions,
  shareScenario,
  shareStatusMessage,
} from "../shareScenario";
import { SCENARIO_HASH_KEY } from "../encodeScenario";

function race(partial: Partial<Race> & Pick<Race, "id">): Race {
  return {
    id: partial.id,
    round: partial.round ?? 1,
    name: partial.name ?? "Test Grand Prix",
    circuit: partial.circuit ?? "Test Circuit",
    date: partial.date ?? "2026-07-01",
    status: partial.status ?? "upcoming",
    hasSprint: partial.hasSprint ?? false,
    grandPrixResult: partial.grandPrixResult ?? null,
    sprintResult: partial.sprintResult ?? null,
    prediction: partial.prediction ?? null,
    sprintPrediction: partial.sprintPrediction ?? null,
  };
}

describe("countScenarioPredictions", () => {
  it("returns zeros when there are no predictions", () => {
    expect(
      countScenarioPredictions([
        race({ id: "a", status: "completed", grandPrixResult: [] }),
        race({ id: "b", prediction: null }),
      ]),
    ).toEqual({ predictionCount: 0, raceCount: 0 });
  });

  it("counts sparse GP and sprint placements across races", () => {
    const prediction: string[] = [];
    prediction[0] = "norris";
    prediction[4] = "piastri";
    const sprint: string[] = [];
    sprint[1] = "verstappen";

    const counts = countScenarioPredictions([
      race({ id: "hungary", prediction }),
      race({
        id: "dutch",
        hasSprint: true,
        sprintPrediction: sprint,
      }),
    ]);

    expect(counts).toEqual({ predictionCount: 3, raceCount: 2 });
  });
});

describe("buildShareUrl", () => {
  it("returns null when the scenario is empty", () => {
    expect(
      buildShareUrl([race({ id: "a" })], {
        origin: "https://example.com",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
  });

  it("builds an absolute URL with the scenario hash", () => {
    const url = buildShareUrl(
      [race({ id: "hungary", prediction: ["norris"] })],
      {
        origin: "https://f1.example",
        pathname: "/calc",
        search: "?ref=1",
      },
    );

    expect(url).toMatch(/^https:\/\/f1\.example\/calc\?ref=1#/);
    expect(url).toContain(`${SCENARIO_HASH_KEY}=`);
  });
});

describe("shareScenario", () => {
  it("returns empty without touching clipboard when there is nothing to share", async () => {
    const clipboardWrite = vi.fn(async () => true);
    const result = await shareScenario([race({ id: "a" })], {
      origin: "https://example.com",
      clipboardWrite,
      preferClipboard: true,
    });

    expect(result.status).toBe("empty");
    expect(clipboardWrite).not.toHaveBeenCalled();
    expect(shareStatusMessage(result)).toMatch(/Add a prediction/i);
  });

  it("copies the absolute URL when native share is disabled", async () => {
    const clipboardWrite = vi.fn(async (text: string) => {
      expect(text).toContain("https://example.com/");
      expect(text).toContain(`#${SCENARIO_HASH_KEY}=`);
      return true;
    });

    const result = await shareScenario(
      [race({ id: "hungary", prediction: ["norris", "piastri"] })],
      {
        origin: "https://example.com",
        pathname: "/",
        search: "",
        preferClipboard: true,
        clipboardWrite,
      },
    );

    expect(result.status).toBe("copied");
    expect(result.predictionCount).toBe(2);
    expect(result.raceCount).toBe(1);
    expect(clipboardWrite).toHaveBeenCalledOnce();
    expect(shareStatusMessage(result)).toMatch(/copied/i);
  });

  it("prefers the Web Share API when available", async () => {
    const nativeShare = vi.fn(async (data: ShareData) => {
      expect(data.url).toContain(`#${SCENARIO_HASH_KEY}=`);
      expect(data.title).toMatch(/F1/i);
    });
    const clipboardWrite = vi.fn(async () => true);

    const result = await shareScenario(
      [race({ id: "hungary", prediction: ["norris"] })],
      {
        origin: "https://example.com",
        pathname: "/",
        nativeShare,
        clipboardWrite,
      },
    );

    expect(result.status).toBe("shared");
    expect(nativeShare).toHaveBeenCalledOnce();
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it("treats AbortError from native share as cancelled", async () => {
    const error = new Error("user cancelled");
    error.name = "AbortError";
    const nativeShare = vi.fn(async () => {
      throw error;
    });

    const result = await shareScenario(
      [race({ id: "hungary", prediction: ["norris"] })],
      {
        origin: "https://example.com",
        pathname: "/",
        nativeShare,
      },
    );

    expect(result.status).toBe("cancelled");
  });

  it("falls back to clipboard when native share fails for other reasons", async () => {
    const nativeShare = vi.fn(async () => {
      throw new Error("share unavailable");
    });
    const clipboardWrite = vi.fn(async () => true);

    const result = await shareScenario(
      [race({ id: "hungary", prediction: ["norris"] })],
      {
        origin: "https://example.com",
        pathname: "/",
        nativeShare,
        clipboardWrite,
      },
    );

    expect(result.status).toBe("copied");
    expect(clipboardWrite).toHaveBeenCalledOnce();
  });

  it("reports failed when clipboard write fails", async () => {
    const result = await shareScenario(
      [race({ id: "hungary", prediction: ["norris"] })],
      {
        origin: "https://example.com",
        pathname: "/",
        preferClipboard: true,
        clipboardWrite: async () => false,
      },
    );

    expect(result.status).toBe("failed");
    expect(shareStatusMessage(result)).toMatch(/Could not copy/i);
  });
});

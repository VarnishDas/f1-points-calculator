import type { DragEndEvent } from "@dnd-kit/core";

export type PredictionDragData =
  | {
      type: "pool-driver";
      driverId: string;
    }
  | {
      type: "prediction-driver";
      driverId: string;
      raceId: string;
      index: number;
    };

export type PredictionDropData = {
  type: "prediction-cell";
  raceId: string;
  index: number;
  editable: boolean;
};

export function getPredictionDragPayload(event: DragEndEvent) {
  return {
    active: event.active.data.current as PredictionDragData | undefined,
    over: event.over?.data.current as PredictionDropData | undefined,
  };
}

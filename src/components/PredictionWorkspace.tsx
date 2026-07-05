import { DndContext, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import { useCalculatorStore } from "../store/useCalculatorStore";
import DriverPool from "./DriverPool";
import PredictionBoard from "./PredictionBoard";
import { getPredictionDragPayload } from "./predictionDnd";

type PredictionWorkspaceProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  driverOrder: string[];
  onClear: () => void;
};

export default function PredictionWorkspace({
  races,
  drivers,
  teams,
  driverOrder,
  onClear,
}: PredictionWorkspaceProps) {
  const updatePrediction = useCalculatorStore((state) => state.updatePrediction);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = getPredictionDragPayload(event);
    if (!active || !over || over.type !== "prediction-cell" || !over.editable) {
      return;
    }

    const targetRace = races.find((race) => race.id === over.raceId);
    if (!targetRace || targetRace.status !== "upcoming") return;

    const currentOrder = targetRace.result ? [...targetRace.result] : [];
    const existingIndex = currentOrder.indexOf(active.driverId);

    if (active.type === "prediction-driver" && active.raceId === targetRace.id) {
      if (existingIndex < 0 || existingIndex === over.index) return;
      const targetIndex = Math.min(over.index, currentOrder.length - 1);
      updatePrediction(targetRace.id, arrayMove(currentOrder, existingIndex, targetIndex));
      return;
    }

    if (existingIndex >= 0) currentOrder.splice(existingIndex, 1);
    const insertIndex = Math.min(over.index, currentOrder.length);
    currentOrder.splice(insertIndex, 0, active.driverId);
    updatePrediction(targetRace.id, currentOrder);
  };

  const handleAutoFill = () => {
    races.forEach((race) => {
      if (race.status === "upcoming") updatePrediction(race.id, driverOrder);
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <DriverPool drivers={drivers} teams={teams} />
        <PredictionBoard
          races={races}
          drivers={drivers}
          teams={teams}
          onClear={onClear}
          onAutoFill={handleAutoFill}
        />
      </DndContext>
    </div>
  );
}

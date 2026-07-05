import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import { useCalculatorStore } from "../store/useCalculatorStore";
import DriverPool from "./DriverPool";
import { DriverTilePreview } from "./DriverTile";
import PredictionBoard from "./PredictionBoard";
import {
  getPredictionDragPayload,
  getPredictionDragStartPayload,
  placeDriverAtPredictionPosition,
  type PredictionDragData,
} from "./predictionDnd";

type PredictionWorkspaceProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  onClear: () => void;
};

export default function PredictionWorkspace({
  races,
  drivers,
  teams,
  onClear,
}: PredictionWorkspaceProps) {
  const updatePrediction = useCalculatorStore((state) => state.updatePrediction);
  const clearPredictionPosition = useCalculatorStore(
    (state) => state.clearPredictionPosition,
  );
  const [activeDrag, setActiveDrag] = useState<PredictionDragData | null>(null);
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  const activeDriver = activeDrag ? driverById.get(activeDrag.driverId) : undefined;
  const activeTeam = activeDriver ? teamById.get(activeDriver.teamId) : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(getPredictionDragStartPayload(event));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = getPredictionDragPayload(event);
    if (!active || !over) {
      return;
    }

    if (over.type === "driver-pool") {
      if (active.type === "prediction-driver") {
        const sourceRace = races.find((race) => race.id === active.raceId);
        if (sourceRace?.status === "upcoming") {
          clearPredictionPosition(active.raceId, active.index);
        }
      }
      return;
    }

    if (!over.editable) return;

    const targetRace = races.find((race) => race.id === over.raceId);
    if (!targetRace || targetRace.status !== "upcoming") return;

    if (
      active.type === "prediction-driver" &&
      active.raceId === targetRace.id &&
      active.index === over.index
    ) {
      return;
    }

    const nextOrder = placeDriverAtPredictionPosition(
      targetRace.result,
      active.driverId,
      over.index,
    );
    updatePrediction(targetRace.id, nextOrder);
  };

  return (
    <section
      aria-label="Prediction workspace"
      className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-hidden"
    >
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <DriverPool drivers={drivers} teams={teams} />
        <PredictionBoard
          races={races}
          drivers={drivers}
          teams={teams}
          onClear={onClear}
        />
        <DragOverlay dropAnimation={null}>
          {activeDriver ? (
            <DriverTilePreview driver={activeDriver} team={activeTeam} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

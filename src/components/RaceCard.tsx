import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { Race } from "../types/race";
import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import { calculateRacePoints } from "../engine/calculateRacePoints";
import { useCalculatorStore } from "../store/useCalculatorStore";
import DriverRow from "./DriverRow";

type RaceCardProps = {
  race: Race;
  drivers: Driver[];
  teams: Team[];
  /**
   * Driver IDs in current projected standings order. Used as the initial
   * display order for upcoming races that have no stored prediction yet.
   */
  driverOrder: string[];
};

export default function RaceCard({ race, drivers, teams, driverOrder }: RaceCardProps) {
  const updatePrediction = useCalculatorStore((s) => s.updatePrediction);

  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const isCompleted = race.status === "completed";
  const displayedOrder = race.result ?? driverOrder;
  const pointsByDriver = calculateRacePoints(race.result);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedOrder.indexOf(String(active.id));
    const newIndex = displayedOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    updatePrediction(race.id, arrayMove(displayedOrder, oldIndex, newIndex));
  };

  return (
    <article
      className={
        isCompleted
          ? "flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/40"
          : "flex flex-col rounded-xl border border-amber-500/30 bg-neutral-900/20"
      }
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-neutral-500">
              R{race.round}
            </span>
            <h3 className="truncate text-sm font-semibold text-white">
              {race.name}
            </h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {race.circuit} · {race.date}
          </p>
        </div>
        {isCompleted ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Actual result
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            Prediction mode
          </span>
        )}
      </header>

      {isCompleted ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {displayedOrder.map((driverId, index) => {
                const driver = driverById.get(driverId);
                const team = driver ? teamById.get(driver.teamId) : undefined;
                return (
                  <DriverRow
                    key={driverId}
                    driverId={driverId}
                    position={index + 1}
                    driver={driver}
                    team={team}
                    points={pointsByDriver[driverId] ?? 0}
                    draggable={false}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-neutral-800/60 px-4 py-2 text-xs text-amber-300/80">
            Drag drivers to reorder this race
          </div>
          <div className="overflow-x-auto">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayedOrder} strategy={verticalListSortingStrategy}>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {displayedOrder.map((driverId, index) => {
                      const driver = driverById.get(driverId);
                      const team = driver ? teamById.get(driver.teamId) : undefined;
                      return (
                        <DriverRow
                          key={driverId}
                          driverId={driverId}
                          position={index + 1}
                          driver={driver}
                          team={team}
                          points={pointsByDriver[driverId] ?? 0}
                          draggable
                        />
                      );
                    })}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </article>
  );
}

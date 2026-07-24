import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useShallow } from "zustand/react/shallow";

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import { useCalculatorStore } from "../store/useCalculatorStore";
import DriverPool from "./DriverPool";
import { DriverTilePreview } from "./DriverTile";
import EmptyState from "./EmptyState";
import PredictionBoard from "./PredictionBoard";
import {
  createPredictionDragAnnouncements,
  getPredictionDragPayload,
  getPredictionDragStartPayload,
  getPredictionMoveSource,
  getPredictionRemovalSource,
  placeDriverAtPredictionPosition,
  predictionCollisionDetection,
  predictionScreenReaderInstructions,
  type PredictionDragData,
} from "./predictionDnd";

const MobilePredictionBoard = lazy(() => import("./MobilePredictionBoard"));

const mobileBoardFallback = (
  <div
    aria-hidden="true"
    className="h-72 animate-pulse rounded-md border border-white/10 bg-neutral-950/75"
  />
);

type PredictionWorkspaceProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  activeDriverIds: string[];
};

export default function PredictionWorkspace({
  races,
  drivers,
  teams,
  activeDriverIds,
}: PredictionWorkspaceProps) {
  const { updatePrediction, clearPredictionPosition } = useCalculatorStore(
    useShallow((state) => ({
      updatePrediction: state.updatePrediction,
      clearPredictionPosition: state.clearPredictionPosition,
    })),
  );
  const isDesktop = useDesktopLayout();
  const [activeDrag, setActiveDrag] = useState<PredictionDragData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const raceById = useMemo(
    () => new Map(races.map((race) => [race.id, race])),
    [races],
  );
  const announcements = useMemo(
    () =>
      createPredictionDragAnnouncements({
        getDriverName: (driverId) => {
          const driver = driverById.get(driverId);
          return driver ? `${driver.firstName} ${driver.lastName}` : driverId;
        },
        getEventName: (raceId, session) => {
          const raceName = raceById.get(raceId)?.name ?? raceId;
          return session === "sprint" ? `${raceName} Sprint` : raceName;
        },
      }),
    [driverById, raceById],
  );
  const activeDriver = activeDrag
    ? driverById.get(activeDrag.driverId)
    : undefined;
  const activeTeam = activeDriver
    ? teamById.get(activeDriver.teamId)
    : undefined;
  const hasUpcomingRaces = races.some((race) => race.status === "upcoming");

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag(getPredictionDragStartPayload(event));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = getPredictionDragPayload(event);
      const removalSource = getPredictionRemovalSource(active, over);
      if (removalSource) {
        clearPredictionPosition(
          removalSource.raceId,
          removalSource.session,
          removalSource.index,
        );
        return;
      }

      if (!active || !over) {
        return;
      }

      if (!over.editable) return;

      const targetRace = races.find((race) => race.id === over.raceId);
      if (!targetRace || targetRace.status !== "upcoming") return;

      if (
        active.type === "prediction-driver" &&
        active.raceId === targetRace.id &&
        active.session === over.session &&
        active.index === over.index
      ) {
        return;
      }

      const targetPrediction =
        over.session === "sprint"
          ? targetRace.sprintPrediction
          : targetRace.prediction;
      const moveSource = getPredictionMoveSource(active, over);
      const nextOrder = placeDriverAtPredictionPosition(
        targetPrediction,
        active.driverId,
        over.index,
      );
      updatePrediction(targetRace.id, over.session, nextOrder);
      if (moveSource) {
        clearPredictionPosition(
          moveSource.raceId,
          moveSource.session,
          moveSource.index,
        );
      }
    },
    [races, updatePrediction, clearPredictionPosition],
  );

  const handleDragCancel = useCallback(() => setActiveDrag(null), []);

  if (!isDesktop) {
    return (
      <section
        aria-label="Prediction workspace"
        className="flex min-w-0 flex-col gap-3"
      >
        {hasUpcomingRaces ? (
          <Suspense fallback={mobileBoardFallback}>
            <MobilePredictionBoard
              races={races}
              drivers={drivers}
              teams={teams}
              activeDriverIds={activeDriverIds}
              onUpdatePrediction={updatePrediction}
              onClearPosition={clearPredictionPosition}
            />
          </Suspense>
        ) : (
          <EmptyState
            title="Season complete"
            description="Every race on the calendar is complete — there are no predictions left to make."
          />
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Prediction workspace"
      className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-hidden"
    >
      {hasUpcomingRaces ? (
        <DndContext
          sensors={sensors}
          collisionDetection={predictionCollisionDetection}
          accessibility={{
            announcements,
            screenReaderInstructions: predictionScreenReaderInstructions,
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <DriverPool
            drivers={drivers}
            teams={teams}
            activeDriverIds={activeDriverIds}
          />
          <PredictionBoard races={races} drivers={drivers} teams={teams} />
          <DragOverlay dropAnimation={null}>
            {activeDriver ? (
              <DriverTilePreview driver={activeDriver} team={activeTeam} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState
          title="Season complete"
          description="Every race on the calendar is complete — there are no predictions left to make."
        />
      )}
    </section>
  );
}

function useDesktopLayout(): boolean {
  const query = "(min-width: 1024px)";
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateLayout = () => setIsDesktop(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return isDesktop;
}

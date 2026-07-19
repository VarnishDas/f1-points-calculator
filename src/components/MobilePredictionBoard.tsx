import { useEffect, useMemo, useRef, useState } from "react";

import type { Driver } from "../types/driver";
import type { PredictionSessionType, Race } from "../types/race";
import type { Team } from "../types/team";
import { getClassificationSize } from "../utils/classification";
import { isPredictionSessionEditable } from "../utils/predictionSession";
import { getInitialMobileRaceId } from "./mobilePredictionBoardState";
import { placeDriverAtPredictionPosition } from "./predictionDnd";

type MobilePredictionBoardProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  activeDriverIds: string[];
  onUpdatePrediction: (
    raceId: string,
    session: PredictionSessionType,
    orderedDriverIds: string[],
  ) => void;
  onClearPosition: (
    raceId: string,
    session: PredictionSessionType,
    positionIndex: number,
  ) => void;
};

export default function MobilePredictionBoard({
  races,
  drivers,
  teams,
  activeDriverIds,
  onUpdatePrediction,
  onClearPosition,
}: MobilePredictionBoardProps) {
  const sortedRaces = useMemo(
    () => [...races].sort((a, b) => a.round - b.round),
    [races],
  );
  const [selectedRaceId, setSelectedRaceId] = useState(
    () => getInitialMobileRaceId(sortedRaces) ?? "",
  );
  const [session, setSession] = useState<PredictionSessionType>("grandPrix");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const pickerViewportRef = useRef<HTMLDivElement>(null);

  const selectedRaceIndex = Math.max(
    0,
    sortedRaces.findIndex((race) => race.id === selectedRaceId),
  );
  const selectedRace = sortedRaces[selectedRaceIndex];
  const hasSprint = selectedRace ? hasSprintSession(selectedRace) : false;

  useEffect(() => {
    if (selectedPosition === null) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPosition(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPosition]);

  useEffect(() => {
    if (selectedPosition === null || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const keepPickerAboveKeyboard = () => {
      if (!pickerViewportRef.current) return;
      pickerViewportRef.current.style.top = `${viewport.offsetTop}px`;
      pickerViewportRef.current.style.height = `${viewport.height}px`;
    };

    keepPickerAboveKeyboard();
    viewport.addEventListener("resize", keepPickerAboveKeyboard);
    viewport.addEventListener("scroll", keepPickerAboveKeyboard);
    return () => {
      viewport.removeEventListener("resize", keepPickerAboveKeyboard);
      viewport.removeEventListener("scroll", keepPickerAboveKeyboard);
    };
  }, [selectedPosition]);

  const activeDriverIdSet = useMemo(
    () => new Set(activeDriverIds),
    [activeDriverIds],
  );
  const activeDrivers = useMemo(
    () =>
      drivers
        .filter((driver) => activeDriverIdSet.has(driver.id))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [activeDriverIdSet, drivers],
  );
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  if (!selectedRace) return null;

  const classificationSize = getClassificationSize(races);
  const prediction =
    session === "sprint"
      ? selectedRace.sprintPrediction
      : selectedRace.prediction;
  const officialResult =
    session === "sprint"
      ? selectedRace.sprintResult
      : selectedRace.status === "completed"
        ? selectedRace.grandPrixResult
        : null;
  const isEditable = isPredictionSessionEditable(selectedRace, session);
  const placedCount = prediction?.filter(Boolean).length ?? 0;
  const currentDriverId =
    selectedPosition === null ? undefined : prediction?.[selectedPosition];
  const filteredDrivers = activeDrivers.filter((driver) =>
    `${driver.firstName} ${driver.lastName} ${teamById.get(driver.teamId)?.name ?? ""}`
      .toLocaleLowerCase()
      .includes(driverSearch.trim().toLocaleLowerCase()),
  );

  const selectRaceAtIndex = (index: number) => {
    const race = sortedRaces[index];
    if (!race) return;
    setSelectedRaceId(race.id);
    setSession("grandPrix");
    setSelectedPosition(null);
    setDriverSearch("");
  };

  const selectSession = (nextSession: PredictionSessionType) => {
    setSession(nextSession);
    setSelectedPosition(null);
    setDriverSearch("");
  };

  const openDriverPicker = (positionIndex: number) => {
    if (!isEditable) return;
    setDriverSearch("");
    setSelectedPosition(positionIndex);
  };

  const placeDriver = (driverId: string) => {
    if (selectedPosition === null) return;
    const nextOrder = placeDriverAtPredictionPosition(
      prediction,
      driverId,
      selectedPosition,
    );
    onUpdatePrediction(selectedRace.id, session, nextOrder);
    setSelectedPosition(null);
  };

  const clearSelectedPosition = () => {
    if (selectedPosition === null) return;
    onClearPosition(selectedRace.id, session, selectedPosition);
    setSelectedPosition(null);
  };

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-neutral-950/75 shadow-2xl shadow-black/25">
      <div className="flex items-center gap-2 border-b border-white/10 p-2">
        <button
          type="button"
          onClick={() => selectRaceAtIndex(selectedRaceIndex - 1)}
          disabled={selectedRaceIndex === 0}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-xl text-neutral-200 disabled:opacity-30"
          aria-label="Previous race"
        >
          ‹
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Selected race</span>
          <select
            value={selectedRace.id}
            onChange={(event) => {
              const index = sortedRaces.findIndex(
                (race) => race.id === event.target.value,
              );
              selectRaceAtIndex(index);
            }}
            className="h-11 w-full appearance-none rounded-md border border-white/10 bg-neutral-900 px-3 text-center text-sm font-black text-white"
          >
            {sortedRaces.map((race) => (
              <option key={race.id} value={race.id}>
                R{race.round} · {formatRaceName(race.name)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => selectRaceAtIndex(selectedRaceIndex + 1)}
          disabled={selectedRaceIndex === sortedRaces.length - 1}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-xl text-neutral-200 disabled:opacity-30"
          aria-label="Next race"
        >
          ›
        </button>
      </div>

      <div className="border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {hasSprint ? (
            <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/25 p-1">
              <SessionButton
                active={session === "grandPrix"}
                label="Grand Prix"
                onClick={() => selectSession("grandPrix")}
              />
              <SessionButton
                active={session === "sprint"}
                label="Sprint"
                onClick={() => selectSession("sprint")}
              />
            </div>
          ) : (
            <span className="text-xs font-black uppercase tracking-[0.12em] text-neutral-200">
              Grand Prix
            </span>
          )}
          <span className="text-xs font-bold tabular-nums text-neutral-500">
            {isEditable ? `${placedCount} / ${classificationSize} placed` : "Official result"}
          </span>
        </div>
        {isEditable ? (
          <p className="mt-2 text-[11px] text-neutral-500">
            Tap a position, then choose a driver.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 p-2.5">
        {Array.from({ length: classificationSize }, (_, positionIndex) => {
          const officialEntry = officialResult?.find(
            (entry) => entry.position === positionIndex + 1,
          );
          const driverId = officialEntry?.driverId ?? prediction?.[positionIndex];
          const driver = driverId ? driverById.get(driverId) : undefined;
          const teamId = officialEntry?.teamId ?? driver?.teamId;
          const team = teamId ? teamById.get(teamId) : undefined;

          return (
            <button
              key={positionIndex}
              type="button"
              onClick={() => openDriverPicker(positionIndex)}
              disabled={!isEditable}
              className={
                driver
                  ? "relative flex h-14 min-w-0 items-center gap-2 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] px-2 text-left"
                  : "flex h-14 min-w-0 items-center gap-2 rounded-md border border-dashed border-white/15 bg-black/20 px-2 text-left"
              }
              aria-label={
                driver
                  ? `Position ${positionIndex + 1}, ${driver.lastName}`
                  : `Position ${positionIndex + 1}, empty`
              }
              aria-haspopup={isEditable ? "dialog" : undefined}
            >
              <span className="grid h-7 w-8 shrink-0 place-items-center rounded bg-white/[0.06] text-[11px] font-black tabular-nums text-neutral-300">
                P{positionIndex + 1}
              </span>
              {driver ? (
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">
                    {driver.lastName}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-500">
                    {team?.name ?? driver.teamId}
                  </span>
                </span>
              ) : (
                <span className="truncate text-xs font-semibold text-neutral-600">
                  Select driver
                </span>
              )}
              {driver ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 right-1.5 w-0.5 rounded-full"
                  style={{ backgroundColor: team?.color ?? "#737373" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedPosition !== null ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setSelectedPosition(null)}
            aria-label="Close driver picker"
          />
          <div
            ref={pickerViewportRef}
            className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="driver-picker-title"
              className="pointer-events-auto flex max-h-[78%] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <h3 id="driver-picker-title" className="text-sm font-black text-white">
                    Choose driver for P{selectedPosition + 1}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {formatRaceName(selectedRace.name)} · {session === "sprint" ? "Sprint" : "Grand Prix"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPosition(null)}
                  className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-lg text-neutral-300"
                  aria-label="Close driver picker"
                >
                  ×
                </button>
              </div>
              <div className="shrink-0 border-b border-white/10 p-3">
                <input
                  type="search"
                  value={driverSearch}
                  onChange={(event) => setDriverSearch(event.target.value)}
                  placeholder="Search drivers or teams"
                  className="driver-search-input h-11 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-base text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {currentDriverId ? (
                  <button
                    type="button"
                    onClick={clearSelectedPosition}
                    className="mb-3 h-11 w-full rounded-md border border-red-500/25 bg-red-500/10 text-xs font-bold text-red-300"
                  >
                    Remove {driverById.get(currentDriverId)?.lastName ?? "driver"} from P{selectedPosition + 1}
                  </button>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {filteredDrivers.map((driver) => {
                    const team = teamById.get(driver.teamId);
                    const assignedPosition = prediction?.indexOf(driver.id) ?? -1;
                    return (
                      <button
                        key={driver.id}
                        type="button"
                        onClick={() => placeDriver(driver.id)}
                        className="relative min-h-14 overflow-hidden rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-1.5 w-0.5 rounded-full"
                          style={{ backgroundColor: team?.color ?? "#737373" }}
                        />
                        <span className="block truncate pl-1.5 text-xs font-black text-white">
                          {driver.lastName}
                        </span>
                        <span className="mt-0.5 block truncate pl-1.5 text-[10px] text-neutral-500">
                          {assignedPosition >= 0
                            ? `${team?.name ?? driver.teamId} · P${assignedPosition + 1}`
                            : team?.name ?? driver.teamId}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {filteredDrivers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No drivers found.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

type SessionButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function SessionButton({ active, label, onClick }: SessionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "h-8 rounded bg-amber-500/10 px-3 text-[11px] font-black text-amber-400 ring-1 ring-amber-500/50"
          : "h-8 rounded px-3 text-[11px] font-bold text-neutral-500"
      }
    >
      {label}
    </button>
  );
}

function hasSprintSession(race: Race): boolean {
  return !!(
    race.hasSprint ||
    race.sprintResult?.length ||
    race.sprintPrediction?.length
  );
}

function formatRaceName(name: string): string {
  return name.replace(/\s+Grand Prix$/i, "");
}

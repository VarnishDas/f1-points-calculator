import { forwardRef, memo } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { useDraggable } from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

type DriverTileProps = {
  driver: Driver;
  team?: Team;
  isAssigned?: boolean;
};

type DriverTileVariant = "pool" | "cell" | "overlay";

const DriverTile = memo(function DriverTile({
  driver,
  team,
  isAssigned = false,
}: DriverTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool:${driver.id}`,
    data: {
      type: "pool-driver",
      driverId: driver.id,
    },
  });

  return (
    <DriverTileSurface
      ref={setNodeRef}
      driver={driver}
      team={team}
      variant="pool"
      isDragging={isDragging}
      isAssigned={isAssigned}
      {...attributes}
      {...listeners}
      tabIndex={-1}
    />
  );
});

export default DriverTile;

type DriverTileSurfaceProps = {
  driver: Driver;
  team?: Team;
  variant: DriverTileVariant;
  isDragging?: boolean;
  isAssigned?: boolean;
};

export const DriverTilePreview = memo(function DriverTilePreview({
  driver,
  team,
}: DriverTileProps) {
  return (
    <DriverTileSurface driver={driver} team={team} variant="overlay" asStatic />
  );
});

export const DriverCellTile = forwardRef<
  HTMLButtonElement,
  Omit<DriverTileButtonProps, "variant" | "asStatic"> &
    ComponentPropsWithoutRef<"button">
>(function DriverCellTile(props, ref) {
  return <DriverTileSurface ref={ref} variant="cell" {...props} />;
});

export const StaticDriverCellTile = memo(function StaticDriverCellTile({
  driver,
  team,
}: Pick<DriverTileProps, "driver" | "team">) {
  return (
    <DriverTileSurface driver={driver} team={team} variant="cell" asStatic />
  );
});

type DriverTileButtonProps = DriverTileSurfaceProps & {
  asStatic?: boolean;
};

const DriverTileSurface = forwardRef<
  HTMLButtonElement | HTMLSpanElement,
  DriverTileButtonProps & ComponentPropsWithoutRef<"button">
>(function DriverTileSurface(
  {
    driver,
    team,
    variant,
    isDragging = false,
    isAssigned = false,
    asStatic = false,
    ...buttonProps
  },
  ref,
) {
  const classes = getTileClasses(variant, isAssigned);
  const style = {
    "--team-color": team?.color ?? "#737373",
    opacity: isDragging ? 0.55 : 1,
  } as CSSProperties;

  if (asStatic) {
    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={classes}
        style={style}
      >
        <TileContent
          driver={driver}
          team={team}
          variant={variant}
          isAssigned={isAssigned}
        />
      </span>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={classes}
      style={style}
      {...buttonProps}
    >
      <TileContent
        driver={driver}
        team={team}
        variant={variant}
        isAssigned={isAssigned}
      />
    </button>
  );
});

const TileContent = memo(function TileContent({
  driver,
  team,
  variant,
  isAssigned = false,
}: DriverTileProps & { variant: DriverTileVariant }) {
  if (variant !== "pool") {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-0.5 rounded-full bg-[var(--team-color)]"
        />
        <span className="max-w-full truncate px-1.5 text-[9px] font-black tracking-[0.02em] text-[var(--team-color)]">
          {driver.code || driver.lastName}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="sr-only">
        Drag {driver.firstName} {driver.lastName} to a prediction position
        {isAssigned ? ", already placed on the board" : ""}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-[var(--team-color)]"
      />
      <span className="flex items-start justify-between gap-1 pl-2">
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-black text-white">
            {driver.lastName}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-neutral-400">
            {team?.name ?? driver.teamId}
          </span>
        </span>
        <span className="shrink-0 rounded bg-white/[0.06] px-1 py-0.5 text-[9px] font-black tabular-nums tracking-wide text-neutral-300">
          {driver.code}
        </span>
      </span>
      {isAssigned ? (
        <span className="mt-1.5 block pl-2 text-[9px] font-bold uppercase tracking-wide text-red-300/90">
          On board
        </span>
      ) : null}
    </>
  );
});

function getTileClasses(variant: DriverTileVariant, isAssigned: boolean) {
  if (variant === "pool") {
    return [
      "relative min-h-11 touch-none select-none overflow-hidden rounded-lg border px-2 py-1.5 text-left shadow-sm transition sm:min-h-10",
      "hover:-translate-y-px hover:shadow-md active:cursor-grabbing active:translate-y-0",
      isAssigned
        ? "border-red-500/25 bg-red-500/[0.06] hover:border-red-400/40 hover:bg-red-500/10"
        : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.08]",
    ].join(" ");
  }

  if (variant === "overlay") {
    return "relative grid h-8 w-14 select-none place-items-center overflow-hidden rounded border border-amber-400/50 bg-neutral-900 text-[11px] shadow-2xl shadow-black/40 ring-1 ring-amber-400/30";
  }

  return "relative grid h-full w-full touch-none select-none place-items-center overflow-hidden rounded border border-white/10 bg-white/[0.06] text-[10px] shadow-sm transition hover:border-white/25 active:cursor-grabbing";
}

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { useDraggable } from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

type DriverTileProps = {
  driver: Driver;
  team?: Team;
};

type DriverTileVariant = "pool" | "cell" | "overlay";

export default function DriverTile({ driver, team }: DriverTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
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
      {...attributes}
      {...listeners}
    />
  );
}

type DriverTileSurfaceProps = {
  driver: Driver;
  team?: Team;
  variant: DriverTileVariant;
  isDragging?: boolean;
};

export function DriverTilePreview({ driver, team }: DriverTileProps) {
  return <DriverTileSurface driver={driver} team={team} variant="overlay" />;
}

export const DriverCellTile = forwardRef<
  HTMLButtonElement,
  Omit<DriverTileButtonProps, "variant" | "asStatic"> &
    ComponentPropsWithoutRef<"button">
>(function DriverCellTile(props, ref) {
  return <DriverTileSurface ref={ref} variant="cell" {...props} />;
});

export function StaticDriverCellTile({
  driver,
  team,
}: Pick<DriverTileProps, "driver" | "team">) {
  return <DriverTileSurface driver={driver} team={team} variant="cell" asStatic />;
}

type DriverTileButtonProps = DriverTileSurfaceProps & {
  asStatic?: boolean;
};

const DriverTileSurface = forwardRef<
  HTMLButtonElement | HTMLSpanElement,
  DriverTileButtonProps & ComponentPropsWithoutRef<"button">
>(function DriverTileSurface(
  { driver, team, variant, isDragging = false, asStatic = false, ...buttonProps },
  ref,
) {
  const classes = getTileClasses(variant);
  const style = {
    "--team-color": team?.color ?? "#737373",
    opacity: isDragging ? 0.65 : 1,
  } as CSSProperties;

  if (asStatic) {
    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={classes}
        style={style}
      >
        <TileContent driver={driver} team={team} variant={variant} />
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
      <TileContent driver={driver} team={team} variant={variant} />
    </button>
  );
});

function TileContent({
  driver,
  team,
  variant,
}: DriverTileProps & { variant: DriverTileVariant }) {
  if (variant !== "pool") {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-0.5 rounded-full bg-[var(--team-color)]"
        />
        <span className="font-black tracking-[0.08em] text-[var(--team-color)]">
          {driver.code}
        </span>
      </>
    );
  }

  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-1.5 w-0.5 rounded-full bg-[var(--team-color)]"
      />
      <span className="block pl-2.5 text-xs font-black tracking-[0.12em] text-white">
        {driver.code}
      </span>
      <span className="mt-0.5 block truncate pl-2.5 text-[10px] font-semibold text-neutral-400">
        {team?.name ?? driver.teamId}
      </span>
    </>
  );
}

function getTileClasses(variant: DriverTileVariant) {
  if (variant === "pool") {
    return "relative min-h-10 touch-none select-none overflow-hidden rounded border border-white/10 bg-white/[0.035] px-2 py-1.5 text-left shadow-sm transition hover:border-white/20 hover:bg-white/[0.07] active:cursor-grabbing";
  }

  if (variant === "overlay") {
    return "relative grid h-8 w-14 select-none place-items-center overflow-hidden rounded border border-amber-400/50 bg-neutral-900 text-[11px] shadow-2xl shadow-black/40 ring-1 ring-amber-400/30";
  }

  return "relative grid h-full w-full touch-none select-none place-items-center overflow-hidden rounded border border-white/10 bg-white/[0.06] text-[10px] shadow-sm transition hover:border-white/25 active:cursor-grabbing";
}

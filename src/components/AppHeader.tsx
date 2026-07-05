type AppHeaderProps = {
  onReset: () => void;
};

export default function AppHeader({ onReset }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="relative h-5 w-12 shrink-0 overflow-hidden rounded-sm bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.35)] before:absolute before:left-0 before:top-0 before:h-full before:w-8 before:-skew-x-[25deg] before:bg-red-500 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:-skew-x-[25deg] after:bg-neutral-950"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <h1 className="shrink-0 text-lg font-black tracking-tight text-white sm:text-xl">
              F1 2026
            </h1>
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-white/15 sm:block"
            />
            <p className="truncate text-sm text-neutral-400 sm:text-base">
              Points Calculator
            </p>
          </div>
          <p className="hidden truncate text-xs text-neutral-500 xl:block">
            Drag drivers to simulate the championship
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ↺
          </span>
          Reset
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white shadow-[0_0_22px_rgba(220,38,38,0.25)] transition hover:bg-red-500"
          aria-label="Share scenario placeholder"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ⤴
          </span>
          Share
        </button>
      </div>
    </header>
  );
}

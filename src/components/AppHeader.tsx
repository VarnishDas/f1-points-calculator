type AppHeaderProps = {
  onReset: () => void;
};

export default function AppHeader({ onReset }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-white/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between lg:px-4">
      <div className="min-w-0">
        <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
          Formula 1 Points Calculator
        </h1>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          Drag drivers to simulate the championship
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ↺
          </span>
          Reset
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-bold text-white shadow-[0_0_22px_rgba(220,38,38,0.25)] transition hover:bg-red-500"
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

type AppHeaderProps = {
  onReset: () => void;
};

export default function AppHeader({ onReset }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
          Formula 1 Points Calculator
        </h1>
        <p className="mt-1 truncate text-sm text-neutral-500 sm:text-base">
          Drag drivers to simulate the championship
        </p>
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

import { completedRaceCount, metadata } from "../data";

const currentYear = new Date().getFullYear();

const linkClassName =
  "rounded-sm text-neutral-400 underline decoration-neutral-700 underline-offset-2 transition-colors hover:text-amber-400 hover:decoration-amber-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

function formatDataAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function Footer() {
  const dataAsOf = formatDataAsOf(metadata.generatedAt);

  return (
    <footer className="shrink-0 border-t border-white/10 bg-neutral-950/50 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] leading-relaxed text-neutral-500 backdrop-blur-sm lg:px-4 lg:py-2 lg:pb-2">
      <p>
        © {currentYear}{" "}
        <a
          href="https://varnishdas.dev"
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
        >
          Varnish Das
        </a>
        . Data powered by{" "}
        <a
          href="https://github.com/jolpica/jolpica-f1"
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
        >
          Jolpica-F1
        </a>{" "}
        under{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
        >
          CC BY-NC-SA 4.0
        </a>
        . Results are transformed for this app.
      </p>
      <p className="mt-1 text-neutral-600">
        {metadata.season} season · {completedRaceCount} completed race
        {completedRaceCount === 1 ? "" : "s"} · data as of {dataAsOf}
      </p>
    </footer>
  );
}

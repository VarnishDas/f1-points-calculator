const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="hidden shrink-0 border-t border-white/10 bg-neutral-950/75 px-3 py-2 text-center text-[11px] leading-relaxed text-neutral-500 lg:block lg:px-4">
      <p>
        © {currentYear} Varnish Das. Data powered by{" "}
        <a
          href="https://github.com/jolpica/jolpica-f1"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-400 underline decoration-neutral-700 underline-offset-2 transition hover:text-amber-400"
        >
          Jolpica-F1
        </a>{" "}
        under{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-400 underline decoration-neutral-700 underline-offset-2 transition hover:text-amber-400"
        >
          CC BY-NC-SA 4.0
        </a>
        . Results are transformed for this app.
      </p>
    </footer>
  );
}

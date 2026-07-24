import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an unexpected error", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-neutral-100">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 place-items-center rounded-full border border-red-500/25 bg-red-500/10 text-2xl font-black text-red-300"
          >
            !
          </span>
          <div>
            <h1 className="text-lg font-black text-white">
              Something went wrong
            </h1>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-neutral-400">
              The points calculator hit an unexpected error. Reloading the page
              usually fixes it.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="h-11 rounded-md bg-red-600 px-5 text-sm font-black text-white shadow-[0_0_22px_rgba(220,38,38,0.2)] transition hover:bg-red-500"
          >
            Reload
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

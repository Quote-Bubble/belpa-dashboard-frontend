"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="surface mx-auto max-w-lg rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        This page hit an unexpected error. Your other quotes are unaffected —
        try again, or go back to the list.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary mt-5 rounded-full px-5 py-2.5 text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}

import type { ReactNode } from "react";

// Pieces the dashboard, Sales and Performance views share

// The page body: a column of cards, faded while a new period loads, with a note when the last
// refresh failed (the numbers shown may then be out of date). ReportPage's frame scrolls it.
export function ViewBody({ loading = false, failed = false, children }: { loading?: boolean; failed?: boolean; children: ReactNode }) {
  return (
    <div aria-busy={loading} className={`flex flex-col gap-3 md:gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
      {failed && (
        <p role="alert" className="rounded-2xl border border-danger/50 bg-milk px-3 py-3 text-sm text-gray-red">
          We couldn&apos;t refresh these numbers. They may be out of date.
        </p>
      )}
      {children}
    </div>
  );
}

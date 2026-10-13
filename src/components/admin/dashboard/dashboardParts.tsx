import type { ReactNode } from "react";

// Pieces the dashboard, Sales and Performance views share

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const monthName = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
};

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <h2 className="font-display text-xl font-normal leading-tight text-gray-red">{title}</h2>
      {children}
    </section>
  );
}

// The page body: a column of cards, faded while a new period loads, with a note when the last
// refresh failed (the numbers shown may then be out of date)
export function ViewBody({ loading = false, failed = false, children }: { loading?: boolean; failed?: boolean; children: ReactNode }) {
  return (
    <div aria-busy={loading} className={`flex flex-col gap-4 overflow-y-auto pb-2 pr-1 md:gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
      {failed && (
        <p role="alert" className="rounded-2xl border border-danger/50 bg-milk px-4 py-3 text-sm text-gray-red">
          We couldn&apos;t refresh these numbers. They may be out of date.
        </p>
      )}
      {children}
    </div>
  );
}

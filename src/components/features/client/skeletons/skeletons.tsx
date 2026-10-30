import type { ReactNode } from "react";
import clsx from "clsx";
import { Card, Skeleton } from "@/components/atoms";
import { surface } from "@/components/tokens";

// The client app's loading placeholders, shaped like the screens they stand in for and drawn inside
// the same ClientScreen frame, so the top bar and the back button don't change when the data arrives.
// Each is one role="status" region named for what's loading; the bars are hidden from screen readers.

/** A loading region: its name is read out once, however many bars it holds */
function Region({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** A heading and its line of subtitle, as a SectionHeader draws them */
function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-6 w-48 max-w-full" />
      <Skeleton className="h-3 w-72 max-w-full" />
    </div>
  );
}

/** The booking steps (Book, Payment, Reschedule): the form takes two thirds and the summary one third */
export function BookingStepSkeleton({ label }: { label: string }) {
  return (
    <Region label={label} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-6 lg:col-span-2">
          <HeaderSkeleton />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-36" />
            <div className="flex flex-col gap-3 @container">
              <div className="flex flex-col gap-3 @xl:flex-row">
                <Skeleton className="h-64 w-full rounded-xl @xl:w-72" />
                <div className="grid flex-1 grid-cols-2 content-start gap-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-9 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
        <Card as="aside" className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-44 max-w-full" />
          <Skeleton className="h-3 w-full" />
          <div className="flex flex-col gap-3 border-t border-crimson-light/40 pt-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex justify-between gap-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Region>
  );
}

/** The payment confirmation: a centred tick, the heading, a line of words and the summary */
export function ConfirmationSkeleton({ label }: { label: string }) {
  return (
    <Region label={label} className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 md:gap-6">
      <Skeleton className="h-14 w-14 rounded-full" />
      <Skeleton className="h-7 w-56 max-w-full" />
      <div className="flex w-full max-w-xl flex-col items-center gap-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <Card className="flex w-full flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </Card>
    </Region>
  );
}

/** Rows of a list in a tinted box (appointments, services, a booking's steps): a round icon or photo
 *  and two lines each */
export function RowsSkeleton({ label, rows = 3, plain = false, className }: { label: string; rows?: number; /** Without the tinted box, where the rows sit directly on a card */ plain?: boolean; className?: string }) {
  return (
    <Region label={label} className={clsx("flex flex-col gap-3", !plain && [surface.tint, "p-3"], className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={i % 2 ? "h-3.5 w-28" : "h-3.5 w-40"} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </Region>
  );
}

/** One form field's box (a dropdown that's still loading its choices) */
export function FieldSkeleton({ label }: { label: string }) {
  return (
    <Region label={label}>
      <Skeleton className="h-11 w-full rounded-md" />
    </Region>
  );
}

/** A label and its value on each line, as the summary rows of the upcoming appointment draw them */
export function SummaryRowsSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <Region label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex justify-between gap-3">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </Region>
  );
}

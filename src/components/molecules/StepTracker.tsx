import { Check, X } from "lucide-react";
import clsx from "clsx";
import type { StepState, TrackerStep } from "@/lib/bookingTracker";

/** Each step state's colours */
const STEP_STYLE: Record<StepState, { dot: string; bar: string; title: string }> = {
  done: { dot: "bg-crimson text-light-orange", bar: "bg-crimson", title: "text-gray-red" },
  current: { dot: "border-2 border-crimson bg-milk text-crimson", bar: "bg-crimson-light", title: "text-berry" },
  upcoming: { dot: "bg-crimson-light/40 text-gray-red", bar: "bg-crimson-light/50", title: "text-gray-red" },
  stopped: { dot: "bg-danger/15 text-danger-ink", bar: "bg-crimson-light/50", title: "text-danger-ink" },
};

/** A step state, read out after the step's title */
export const stepStateLabel = (state: StepState) =>
  state === "done" ? "done" : state === "current" ? "in progress" : state === "stopped" ? "stopped" : "not yet";

// Where something is, step by step (a booking from booked to the finished visit): numbered dots
// joined by a line, the done ones ticked, the current one ringed, a stopped one crossed.
export default function StepTracker({ steps, label }: { steps: TrackerStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, i) => {
        const style = STEP_STYLE[step.state];
        const last = i === steps.length - 1;
        return (
          <li key={step.key} aria-current={step.state === "current" ? "step" : undefined} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span aria-hidden="true" className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", style.dot)}>
                {step.state === "done" ? <Check size={16} strokeWidth={3} /> : step.state === "stopped" ? <X size={16} strokeWidth={3} /> : i + 1}
              </span>
              {!last && <span aria-hidden="true" className={clsx("my-1 w-1 flex-1 rounded-full", style.bar)} />}
            </div>
            <div className={clsx("grid min-w-0 flex-1 gap-x-3 gap-y-0.5 sm:grid-cols-[1fr_auto]", !last && "pb-6")}>
              <p className={clsx("text-sm font-bold", style.title)}>
                {step.title}
                <span className="sr-only">: {stepStateLabel(step.state)}</span>
              </p>
              {step.when && <p className="text-xs text-gray-red sm:text-right">{step.when}</p>}
              {step.detail && <p className="text-[13px] text-gray-red sm:col-span-2">{step.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import { Check } from "lucide-react";
import clsx from "clsx";

/**
 * A row of numbered steps joined by a line (the done ones ticked, the current one ringed): where a client is in a
 * short procedure such as booking. `current` is the 0-based index of the step they're on.
 */
export default function StepBar({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex items-start">
      {steps.map((title, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={title} aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span aria-hidden="true" className={clsx("h-1 flex-1 rounded-full", i === 0 ? "bg-transparent" : i <= current ? "bg-crimson" : "bg-crimson-light/50")} />
              <span
                aria-hidden="true"
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  state === "done" && "bg-crimson text-on-crimson",
                  state === "current" && "border-2 border-crimson bg-milk text-crimson-ink",
                  state === "upcoming" && "bg-crimson-light/40 text-gray-red",
                )}
              >
                {state === "done" ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <span aria-hidden="true" className={clsx("h-1 flex-1 rounded-full", i === steps.length - 1 ? "bg-transparent" : i < current ? "bg-crimson" : "bg-crimson-light/50")} />
            </div>
            <span className={clsx("text-xs", state === "current" ? "font-bold text-berry" : "text-gray-red")}>
              {title}
              <span className="sr-only">: {state === "done" ? "done" : state === "current" ? "in progress" : "not yet"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

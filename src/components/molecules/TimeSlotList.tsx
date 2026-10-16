import clsx from "clsx";
import { Button } from "@/components/atoms";
import { surface } from "../tokens";
import SectionHeader from "./SectionHeader";

interface TimeSlotListProps {
  slots: string[];
  selected: string;
  onSelect: (slot: string) => void;
  isBlocked: (slot: string) => boolean;
  format: (slot: string) => string;
  /** Shown instead of the slots when there are none, e.g. "Select a date first." */
  emptyText: string;
  /** Two columns that scroll, for a narrow dialog */
  columns?: 1 | 2;
  /** In a tinted box of its own; off when the caller already frames it */
  boxed?: boolean;
}

// The day's times as pills: the chosen one filled and pressed, taken ones greyed out and struck through.
export default function TimeSlotList({ slots, selected, onSelect, isBlocked, format, emptyText, columns = 1, boxed = false }: TimeSlotListProps) {
  return (
    <div className={clsx("flex w-full min-w-0 flex-col gap-3", boxed && [surface.tint, "p-3"])}>
      <SectionHeader size="label" title="Time" />
      {slots.length === 0 ? (
        <p className={clsx(surface.tint, "p-3 text-center text-[13px] text-gray-red")}>{emptyText}</p>
      ) : (
        <div className={columns === 2 ? "grid max-h-47.5 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:max-h-55" : "flex flex-col gap-3"}>
          {slots.map((slot) => {
            const blocked = isBlocked(slot);
            return (
              <Button
                variant="bare"
                key={slot}
                type="button"
                disabled={blocked}
                onClick={() => onSelect(slot)}
                aria-pressed={selected === slot}
                className={clsx(
                  "w-full rounded-full border px-3 py-2 text-[13px] font-bold transition-colors",
                  selected === slot
                    ? "border-berry bg-berry text-pearl"
                    : blocked
                      ? "cursor-not-allowed border-crimson-light/50 text-gray-red line-through"
                      : "border-crimson-light bg-milk text-gray-red hover:border-crimson hover:text-berry",
                )}
              >
                {format(slot)}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

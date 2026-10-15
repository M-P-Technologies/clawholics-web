import clsx from "clsx";
import { Button } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";
import { surface } from "@/components/tokens";

interface TimeSlotListProps {
  slots: string[];
  selected: string;
  onSelect: (slot: string) => void;
  isBlocked: (slot: string) => boolean;
  format: (slot: string) => string;
  emptyText: string;
}

// The day's times as pills: the chosen one filled, taken ones greyed out and struck through.
export default function TimeSlotList({
  slots,
  selected,
  onSelect,
  isBlocked,
  format,
  emptyText,
}: TimeSlotListProps) {
  return (
    <div className={clsx(surface.tint, "flex w-full min-w-0 flex-col gap-3 p-4")}>
      <SectionHeader size="label" title="Time" />
      {slots.length === 0 ? (
        <p className="text-center text-sm text-gray-red/80">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {slots.map((slot, index) => {
            const blocked = isBlocked(slot);

            return (
              <Button
                variant="bare"
                key={`${slot}-${index}`}
                type="button"
                disabled={blocked}
                onClick={() => onSelect(slot)}
                className={clsx(
                  "w-full rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                  selected === slot
                    ? "border-crimson bg-crimson text-milk"
                    : blocked
                      ? "cursor-not-allowed border-crimson-light/40 bg-transparent text-gray-red/40 line-through"
                      : "cursor-pointer border-crimson-light bg-milk text-gray-red hover:border-crimson hover:text-crimson",
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

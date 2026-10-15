import Button from "../../../components/ui/Button";
interface TimeSlotListProps {
  slots: string[];
  selected: string;
  onSelect: (slot: string) => void;
  isBlocked: (slot: string) => boolean;
  format: (slot: string) => string;
  emptyText: string;
}

export default function TimeSlotList({
  slots,
  selected,
  onSelect,
  isBlocked,
  format,
  emptyText,
}: TimeSlotListProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-sm border border-crimson-light/80 bg-light-orange px-4 py-4">
      <p className="text-center label-caps">
        Time
      </p>
      {slots.length === 0 ? (
        <p className="text-center text-gray-red/80">{emptyText}</p>
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
              className={`w-full cursor-pointer rounded-sm border px-4 py-2 text-sm font-bold transition-colors ${
                selected === slot
                  ? "border-crimson bg-crimson text-light-orange"
                  : blocked
                    ? "cursor-not-allowed border-crimson-light/60 text-gray-red/40"
                    : "border-crimson-light text-gray-red hover:border-crimson hover:text-crimson"
              }`}
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

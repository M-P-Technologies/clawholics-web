import { X as XIcon } from "lucide-react";
import React from "react";
import type { NailistTimeSlots } from "@/services/nailistService";
import { SectionHeader } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { formatTimeDisplay, openTimePicker, splitTimeSlot } from "@/lib/admin/artistEditor";
import { useTimeSlots } from "@/hooks/admin/useTimeSlots";

const TimeSlotCard = ({
  nailistId,
  disabled,
  timeSlots,
  setTimeSlots,
  onTimeSlotsLoaded,
}: {
  nailistId?: number;
  disabled: boolean;
  timeSlots: NailistTimeSlots;
  setTimeSlots: React.Dispatch<React.SetStateAction<NailistTimeSlots>>;
  onTimeSlotsLoaded: (timeSlots: NailistTimeSlots) => void;
}) => {
  const {
    isLoading,
    newStartTime,
    setNewStartTime,
    newEndTime,
    setNewEndTime,
    updateTimeSlot,
    deleteTimeSlot,
    handleAddTimeSlot,
  } = useTimeSlots({ nailistId, disabled, timeSlots, setTimeSlots, onTimeSlotsLoaded });

  const TimePill = ({
    value,
    displayValue,
    onChange,
  }: {
    value: string;
    displayValue: string;
    onChange: (value: string) => void;
  }) => {
    return disabled ? (
      <div className="w-full h-[35px] bg-milk rounded-md px-3 flex items-center text-sm text-gray-red leading-none cursor-not-allowed border border-crimson-light">
        {displayValue}
      </div>
    ) : (
      <div
        className="relative w-full h-[35px] bg-milk rounded-md px-4 flex items-center cursor-pointer border border-crimson-light"
        onClick={(e) => openTimePicker(e.currentTarget)}
      >
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-sm text-gray-red outline-none cursor-pointer appearance-none p-0 m-0 leading-none [&::-webkit-calendar-picker-indicator]:hidden"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader size="label" title="Time Slots" />

      {isLoading ? (
        <p className="text-[15px] text-gray-red">Loading time slots...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`grid gap-4 items-center ${
              disabled
                ? "grid-cols-[1fr_1fr]"
                : "grid-cols-[1fr_1fr_20px]"
            }`}
          >
            <p className="text-[13px] font-bold text-center text-gray-red">
              Start Time
            </p>

            <p className="text-[13px] font-bold text-center text-gray-red">
              End Time
            </p>

            {!disabled && <div />}

            {timeSlots.length > 0 ? (
              timeSlots.map((timeSlot, index) => {
                const { startTime, endTime } = splitTimeSlot(timeSlot);

                return (
                  <React.Fragment key={`${timeSlot}-${index}`}>
                    <TimePill
                      value={startTime}
                      displayValue={formatTimeDisplay(startTime)}
                      onChange={(value) =>
                        updateTimeSlot(index, "startTime", value)
                      }
                    />

                    <TimePill
                      value={endTime}
                      displayValue={formatTimeDisplay(endTime)}
                      onChange={(value) =>
                        updateTimeSlot(index, "endTime", value)
                      }
                    />

                    {!disabled && (
                      <Button
                        variant="bare"
                        type="button"
                        onClick={() => deleteTimeSlot(index)}
                        className="flex items-center justify-center w-6 h-6"
                      >
                        <XIcon size={24} className="text-crimson" />
                      </Button>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <p
                className={`text-[15px] text-gray-red ${
                  disabled ? "col-span-2" : "col-span-3"
                }`}
              >
                No time slots available.
              </p>
            )}
          </div>

          {!disabled && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_1fr_20px] gap-4 items-center">
                <TimePill
                  value={newStartTime}
                  displayValue={formatTimeDisplay(newStartTime)}
                  onChange={setNewStartTime}
                />

                <TimePill
                  value={newEndTime}
                  displayValue={formatTimeDisplay(newEndTime)}
                  onChange={setNewEndTime}
                />

                <div />
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="w-[100px]"
                >
                  ADD
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSlotCard;

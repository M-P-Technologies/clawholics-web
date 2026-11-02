import { ATTENTION_MOST, ATTENTION_ROWS } from "@/lib/admin/attention";
import { useFitRows } from "./useFitRows";

/** Put on each of the queue's rows, so they can be measured */
export const QUEUE_ROW = "data-queue-row";

// How many rows the dashboard's To act on queue shows: from lg up, where its column sits beside the
// notes and active bookings, as many as keep the two columns level (3 to 15); stacked, five.
export function useQueueRows() {
  return useFitRows({ rowAttribute: QUEUE_ROW, fallback: ATTENTION_ROWS, fewest: 3, most: ATTENTION_MOST, sideBySide: "(min-width: 64rem)" });
}

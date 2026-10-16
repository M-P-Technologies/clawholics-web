import { timeRangeLabel } from "../lib/timeFormat";

// --- HELPER FUNCTIONS ---
const parseTimeRange = (range: string) => {
  const [start, end] = range.split("-");
  const toNumber = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return { start: toNumber(start), end: toNumber(end) };
};

export const isOverlapping = (a: string, b: string) => {
  const r1 = parseTimeRange(a);
  const r2 = parseTimeRange(b);
  return r1.start < r2.end && r2.start < r1.end;
};

export const toLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatSlot = timeRangeLabel;

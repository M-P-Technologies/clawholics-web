// The create-appointment form's types and pure helpers (state in hooks/admin/useCreateAppointment)
import { timeRangeLabel } from "../timeFormat";

export interface Service {
  id: number;
  name: string;
  category?: string;
  description?: string;
  master_price: number;
  junior_price: number;
  duration: string;
}

export interface NailArtist {
  id: number;
  name: string;
  category_id?: number;
}

export const parseTimeRange = (range: string) => {
  const [start, end] = range.split("-");

  const toNumber = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };

  return {
    start: toNumber(start),
    end: toNumber(end),
  };
};

export const toLocalDate = (dateStr: string) => {
  const [year, monthNumber, day] = dateStr.split("-").map(Number);
  return new Date(year, monthNumber - 1, day);
};

export const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${monthNumber}-${day}`;
};

export const isOverlapping = (slotA: string, slotB: string) => {
  const rangeA = parseTimeRange(slotA);
  const rangeB = parseTimeRange(slotB);

  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
};

export const formatSlot = timeRangeLabel;

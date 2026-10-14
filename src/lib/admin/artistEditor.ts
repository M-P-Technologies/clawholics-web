// The artist editor's constants and pure helpers (the editor is in
// components/features/admin/catalog/ArtistEditor.tsx, its state in hooks/admin/useArtistEditor.ts)

export const POSITION_CATEGORIES = [
  "Master Technician",
  "Junior Technician",
];

export const WEEK_DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatTimeDisplay = (time: string) => {
  if (!time) return "";

  const [hourValue, minute] = time.split(":");
  const hour = Number(hourValue);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour.toString().padStart(2, "0")}:${minute} ${period}`;
};

export const splitTimeSlot = (timeSlot: string) => {
  const [startTime = "", endTime = ""] = timeSlot
    .split("-")
    .map((value) => value.trim());

  return { startTime, endTime };
};

// Opens the browser's time picker for the time input inside a slot's pill
export const openTimePicker = (wrapper: HTMLDivElement) => {
  const input = wrapper.querySelector("input");

  if (!input) return;

  input.focus();

  if (typeof input.showPicker === "function") {
    input.showPicker();
  }
};

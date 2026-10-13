import { describe, expect, it } from "vitest";
import { addDays, mergeSchedules, scheduleClientName, sortByStartTime, startMinutes, toDateKey, weekDays, weekMonthKeys } from "@/services/scheduleAgenda";
import type { MonthlySchedule } from "@/services/scheduleService";

describe("scheduleAgenda", () => {
  it("formats a local date key", () => {
    expect(toDateKey(new Date(2026, 9, 5))).toBe("2026-10-05");
  });

  it("adds days across a month end", () => {
    expect(toDateKey(addDays(new Date(2026, 8, 28), 7))).toBe("2026-10-05");
    expect(toDateKey(addDays(new Date(2026, 9, 1), -1))).toBe("2026-09-30");
  });

  it("gives Monday to Sunday for any day in the week", () => {
    // Wed 14 Oct 2026
    expect(weekDays(new Date(2026, 9, 14)).map(toDateKey)).toEqual([
      "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
    ]);
    // Sunday belongs to the week that started the Monday before
    expect(weekDays(new Date(2026, 9, 18)).map(toDateKey)[0]).toBe("2026-10-12");
  });

  it("covers a week that spans two months", () => {
    expect(weekDays(new Date(2026, 9, 1)).map(toDateKey)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });

  it("reads the start of a time range", () => {
    expect(startMinutes("10:30-12:00")).toBe(630);
    expect(startMinutes("9:05")).toBe(545);
  });

  it("puts a missing or odd time last instead of failing", () => {
    expect(startMinutes(undefined)).toBe(Number.MAX_SAFE_INTEGER);
    expect(startMinutes(null)).toBe(Number.MAX_SAFE_INTEGER);
    expect(startMinutes("TBD")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("sorts by start time without changing the input", () => {
    const input = [
      { id: 1, appointment_time: "14:00-15:00" },
      { id: 2, appointment_time: null },
      { id: 3, appointment_time: "09:00-10:00" },
    ];
    expect(sortByStartTime(input).map((a) => a.id)).toEqual([3, 1, 2]);
    expect(input.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it("names the client from the best available field", () => {
    const base = { id: 1, nailist_id: 1, nailist_name: "", appointment_date: "", appointment_time: "", service_name: "", status: "" };
    expect(scheduleClientName({ ...base, client_name: "Ana Cruz" })).toBe("Ana Cruz");
    expect(scheduleClientName({ ...base, first_name: "Bea", last_name: "Lim" })).toBe("Bea Lim");
    expect(scheduleClientName({ ...base, user_id: 7 })).toBe("User #7");
  });

  it("lists the months a week touches", () => {
    expect(weekMonthKeys(new Date(2026, 9, 14))).toEqual(["2026-10"]);
    expect(weekMonthKeys(new Date(2026, 9, 1))).toEqual(["2026-09", "2026-10"]);
  });

  it("merges two months of schedule without repeating anything", () => {
    const appt = (id: number) => ({ id, nailist_id: 1, nailist_name: "Ana", appointment_date: "", appointment_time: "", service_name: "", status: "" });
    const off = { nailist_id: 1, day_off_type: "REGULAR" as const, day_of_week: 0 };
    const a: MonthlySchedule = { appointments: [appt(1)], dayOffs: [off], nailists: [{ id: 1, name: "Ana" }], timeSlots: [] };
    const b: MonthlySchedule = { appointments: [appt(1), appt(2)], dayOffs: [off], nailists: [{ id: 1, name: "Ana" }], timeSlots: [] };
    const merged = mergeSchedules(a, b);
    expect(merged.appointments.map((x) => x.id)).toEqual([1, 2]);
    expect(merged.dayOffs).toHaveLength(1);
    expect(merged.nailists).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { busiestWeekdays } from "@/lib/dashboardFormat";

// Mon 16, Tue 0, Wed 13, Thu 14, Fri 17, Sat 24, Sun 16
const week = [16, 0, 13, 14, 17, 24, 16].map((bookings, i) => ({ weekday: i + 1, bookings }));

describe("busiestWeekdays", () => {
  it("shows as many days as there are artists, the busiest first, spelled out", () => {
    expect(busiestWeekdays(week, 5)).toEqual([
      { label: "Saturday", value: 24 },
      { label: "Friday", value: 17 },
      { label: "Monday", value: 16 }, // a tie with Sunday goes to the earlier day
      { label: "Sunday", value: 16 },
      { label: "Thursday", value: 14 },
    ]);
    expect(busiestWeekdays(week, 1)).toEqual([{ label: "Saturday", value: 24 }]);
  });

  it("goes back to Monday to Sunday with seven or more artists, or none", () => {
    const mondayToSunday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (const artists of [0, 7, 8]) {
      expect(busiestWeekdays([...week].reverse(), artists).map((d) => d.label)).toEqual(mondayToSunday);
    }
  });
});

import { describe, expect, it } from "vitest";
import { CLIENT_PATHS, CLIENT_TABS, isInnerScreen, isTabActive } from "@/lib/client/clientNav";

const tab = (label: string) => CLIENT_TABS.find((t) => t.label === label)!;

describe("client navigation", () => {
  it("has the four tabs in the mockup's order", () => {
    expect(CLIENT_TABS.map((t) => t.label)).toEqual(["Home", "Appointments", "Explore", "Profile"]);
    expect(CLIENT_TABS.map((t) => t.href)).toEqual(["/my", "/my/appointments", "/my/explore", "/my/profile"]);
  });

  it("marks Home active only on /my itself", () => {
    expect(isTabActive(tab("Home"), "/my")).toBe(true);
    expect(isTabActive(tab("Home"), "/my/explore")).toBe(false);
  });

  it("keeps Explore active on a service's page", () => {
    expect(isTabActive(tab("Explore"), "/my/explorer")).toBe(false);
  });

  it("treats the service page and the booking steps as inner screens", () => {
    for (const path of [CLIENT_PATHS.book, CLIENT_PATHS.payment, CLIENT_PATHS.confirmation, CLIENT_PATHS.reschedule]) {
      expect(isInnerScreen(path)).toBe(true);
    }
    for (const path of [CLIENT_PATHS.home, CLIENT_PATHS.appointments, CLIENT_PATHS.explore, "/my/explore/3", CLIENT_PATHS.profile]) {
      expect(isInnerScreen(path)).toBe(false);
    }
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddToCalendarButton from "@/components/features/client/appointments/AddToCalendarButton";
import AppointmentDetails from "@/components/features/client/appointments/AppointmentDetails";
import type { AppointmentView } from "@/types/profile";

vi.mock("@/hooks/useSalonAddress", () => ({ useSalonAddress: () => "7th 3rd Street, Nazareth, Cagayan de Oro" }));
const download = vi.fn();
vi.mock("@/utils/downloadTextFile", () => ({ downloadTextFile: (...args: unknown[]) => download(...args) }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("@/components/features/client/appointments/PaymentProofCard", () => ({ default: () => null }));

beforeEach(() => download.mockReset());

describe("AddToCalendarButton", () => {
  it("downloads the visit as a calendar file, with its address", () => {
    render(<AddToCalendarButton id={7} service="Gel Manicure" artist="Maxine" date="2099-10-21" time="13:00-15:00" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(download).toHaveBeenCalledTimes(1);
    const [filename, text, type] = download.mock.calls[0];
    expect(filename).toBe("clawholics-appointment-7.ics");
    expect(type).toBe("text/calendar");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("DTSTART:20991021T050000Z");
    expect(text).toContain("LOCATION:7th 3rd Street\\, Nazareth\\, Cagayan de Oro");
  });

  it("also links Google Calendar, in a new tab", () => {
    render(<AddToCalendarButton id={7} service="Gel Manicure" artist="Maxine" date="2099-10-21" time="13:00-15:00" />);
    const link = screen.getByRole("link", { name: /Google Calendar/ });
    expect(link.getAttribute("href")).toContain("https://calendar.google.com/calendar/render");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("is left out when the visit's time can't be read", () => {
    const { container } = render(<AddToCalendarButton id={7} service="Gel" date="soon" time="13:00-15:00" />);
    expect(container).toBeEmptyDOMElement();
  });
});

const view = (status: string, date: string): AppointmentView => ({
  appt: { id: 7, service_name: "Gel Manicure", nailist_id: 1, nailist_name: "Max", appointment_date: date, appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: false, canCancel: false, statusLabel: status,
  dateLabel: "", timeLabel: "", canPay: false, payLabel: "", isLocked: false,
});
const details = (v: AppointmentView) =>
  render(
    <AppointmentDetails view={v} now={0} tokenFetcher={async () => "t"} onPay={vi.fn()} onReschedule={vi.fn()} onCancel={vi.fn()} onProofUploaded={vi.fn()} onSubmitReview={vi.fn(async () => undefined)} />,
  );

describe("the appointment's details", () => {
  it("offer to add a confirmed visit that's still to come", () => {
    details(view("confirmed", "2099-10-21"));
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
  });

  it("don't for a visit that's past, cancelled or not confirmed yet", () => {
    for (const v of [view("confirmed", "2020-10-21"), view("cancelled", "2099-10-21"), view("pending", "2099-10-21")]) {
      const { unmount } = details(v);
      expect(screen.queryByRole("button", { name: "Add to calendar" })).toBeNull();
      unmount();
    }
  });
});

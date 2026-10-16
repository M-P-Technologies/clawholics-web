import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentSheet from "@/components/features/client/appointments/AppointmentSheet";
import EditDetailsSheet from "@/components/features/client/profile/EditDetailsSheet";
import type { AppointmentView } from "@/types/profile";

vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("@/components/features/client/appointments/PaymentProofCard", () => ({ default: () => null }));

const view = (over: Partial<AppointmentView> = {}): AppointmentView => ({
  appt: { id: 5, service_name: "Hard Gel", nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status: "confirmed" },
  displayStatus: "confirmed", remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: "confirmed",
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: true, payLabel: "9:35", isLocked: false, ...over,
});
const sheetProps = () => ({
  photo: "", now: 0, tokenFetcher: async () => "t", clerkId: "u",
  onClose: vi.fn(), onPay: vi.fn(), onReschedule: vi.fn(), onCancel: vi.fn(), onProofUploaded: vi.fn(), onSubmitReview: vi.fn(async () => undefined),
});

describe("the client's drawers", () => {
  it("shows an appointment in a drawer, its details as rows, and every action", () => {
    const p = sheetProps();
    render(<AppointmentSheet view={view()} {...p} />);
    const sheet = within(screen.getByRole("dialog", { name: "Appointment" }));
    expect(document.querySelector(".drawer-right")).not.toBeNull();
    expect(sheet.getByText("Hard Gel")).toBeInTheDocument();
    for (const label of ["Artist", "Date", "Time", "Status"]) expect(sheet.getByText(label, { selector: "dt" })).toBeInTheDocument();
    expect(sheet.getByText("October 20, 2026", { selector: "dd" })).toBeInTheDocument();
    fireEvent.click(sheet.getByRole("button", { name: /Complete payment/ }));
    fireEvent.click(sheet.getByRole("button", { name: "Reschedule" }));
    fireEvent.click(sheet.getByRole("button", { name: "Cancel appointment" }));
    expect(p.onPay).toHaveBeenCalled();
    expect(p.onReschedule).toHaveBeenCalled();
    expect(p.onCancel).toHaveBeenCalled();
  });

  it("edits the details in a drawer", () => {
    render(
      <EditDetailsSheet
        open error={null}
        fields={[{ id: "first_name", label: "First name", name: "first_name", value: "Ana", onChange: vi.fn() }] as never}
        genderLabel="Female" genderOptions={[]} genderValue="female" isGenderOpen={false} onToggleGender={vi.fn()} onSelectGender={vi.fn()}
        contactMethod="" contactMethodOptions={[]} onSelectContactMethod={vi.fn()}
        onSave={vi.fn()} onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Edit details" })).toBeInTheDocument();
    expect(document.querySelector(".drawer-right")).not.toBeNull();
    expect(screen.getByLabelText(/First name/)).toHaveValue("Ana");
  });
});

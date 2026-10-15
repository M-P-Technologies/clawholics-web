import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Booking from "@/views/client/Booking";
import Reschedule from "@/views/client/Reschedule";

const booking = vi.fn();
const reschedule = vi.fn();
vi.mock("@/hooks/client/useBooking", () => ({ useBooking: () => booking() }));
vi.mock("@/hooks/client/useReschedule", () => ({ useReschedule: () => reschedule() }));
vi.mock("@/lib/router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

const now = new Date();
const common = {
  month: new Date(now.getFullYear(), now.getMonth(), 1), setMonth: vi.fn(), isDisabledDate: () => false, isDateFullyBooked: () => false,
  isSlotBlocked: () => false, handleDateSelect: vi.fn(), selectedDay: undefined, setSelectedTime: vi.fn(), selectedTime: "", selectedDate: "",
  modalOpen: false, modalTitle: "", modalMessage: "",
};

describe("step layout", () => {
  it("booking: cards, no public-site panels, calendar beside times only when its column is wide", () => {
    booking.mockReturnValue({
      ...common, priceLabel: "₱650", pageData: {}, isPageLoading: false, pageError: "", nailists: [], selectedNailist: null, timeSlots: [],
      modalAction: undefined, modalButtonText: "OK", service_category: "Gel", service_description: "", service_name: "Hard Gel", service_image: "",
      variants: [], selectedVariantId: null, setSelectedVariantId: vi.fn(), selectedAddonIds: [], setSelectedAddonIds: vi.fn(), addons: [],
      locationUrl: "", locationText: "", formatSlot: (s: string) => s, handleContinue: vi.fn(), isSubmitting: false,
      handleArtistChange: vi.fn(), closeModal: vi.fn(), reloadPage: vi.fn(),
    });
    const { container } = render(<Booking />);
    expect(container.querySelector(".bg-light-orange")).toBeNull();
    expect(container.querySelector(".rounded-sm")).toBeNull();
    expect(container.querySelector(".label-caps")).toBeNull();
    expect(screen.getByRole("heading", { name: "Booking summary" }).closest(".rounded-2xl")).not.toBeNull(); // surface.card
    expect(container.querySelector(".\\@container .\\@xl\\:flex-row")).not.toBeNull();
    expect(screen.getByText("Gel")).toHaveClass("rounded-full"); // Badge
  });

  it("reschedule: cards, no public-site panels", () => {
    reschedule.mockReturnValue({
      ...common, isLoaded: true,
      appointment: { service_name: "Hard Gel", service_description: "", nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00" },
      isSubmitting: false, formatDisplayDate: (d: string) => d, handleConfirmReschedule: vi.fn(), uniqueTimeSlots: [], handleModalClose: vi.fn(),
    });
    const { container } = render(<Reschedule />);
    expect(container.querySelector(".bg-light-orange")).toBeNull();
    expect(container.querySelector(".label-caps")).toBeNull();
    for (const t of ["Current appointment", "New selection"]) {
      expect(screen.getByRole("heading", { name: t }).closest(".rounded-2xl")).not.toBeNull();
    }
    expect(container.querySelector(".\\@container .\\@xl\\:flex-row")).not.toBeNull();
  });
});

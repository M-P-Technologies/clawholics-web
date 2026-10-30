import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Booking from "@/app/(client)/my/book/page";
import Reschedule from "@/app/(client)/my/reschedule/page";
import Payment from "@/app/(client)/my/payment/page";
import PaymentConfirmation from "@/app/(client)/my/confirmation/page";

const booking = vi.fn();
const reschedule = vi.fn();
const payment = vi.fn();
const confirmation = vi.fn();
// The screens draw ClientScreen, which reads the account the client app provides
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/useBooking", () => ({ useBooking: () => booking() }));
vi.mock("@/hooks/client/useReschedule", () => ({ useReschedule: () => reschedule() }));
vi.mock("@/hooks/client/usePayment", () => ({ usePayment: () => payment() }));
vi.mock("@/hooks/client/usePaymentConfirmation", () => ({ usePaymentConfirmation: () => confirmation() }));
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
      handleArtistChange: vi.fn(), closeModal: vi.fn(), reloadPage: vi.fn(), contactFields: [], contact: { options: [], value: "", status: "idle", choose: vi.fn(), ready: true, missing: "" },
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
    for (const t of ["Reschedule summary", "New selection"]) {
      expect(screen.getByRole("heading", { name: t }).closest(".rounded-2xl")).not.toBeNull();
    }
    expect(container.querySelector(".\\@container .\\@xl\\:flex-row")).not.toBeNull();
  });
});

describe("payment layout", () => {
  it("payment: cards, the countdown in a tinted box", () => {
    payment.mockReturnValue({
      methods: [{ code: "QRPH", label: "QR Ph", hint: "" }], toggleAgree: vi.fn(), method: "QRPH", setMethod: vi.fn(), agree: false, loading: false,
      isInvalid: false, timeLeft: "09:41", modalOpen: false, modalTitle: "", modalMessage: "", modalAction: undefined, modalButtonText: "OK",
      modalDismissible: true, handlePay: vi.fn(), handleModalClose: vi.fn(),
      appointment: { service_name: "Hard Gel", nailist_name: "Max", nailist_category_id: 2, service_price: 650, appointment_date: "2026-10-20", appointment_time: "9:00 AM" },
    });
    const { container } = render(<Payment />);
    expect(container.querySelector(".bg-light-orange")).toBeNull();
    expect(container.querySelector(".label-caps")).toBeNull();
    expect(screen.getByRole("heading", { name: "Payment summary" }).closest(".rounded-2xl")).not.toBeNull();
    expect(screen.getByText("09:41").closest(".rounded-xl")).not.toBeNull(); // surface.tint
  });

  it("confirmation: the booking in a card, the loader still on its own", () => {
    confirmation.mockReturnValue({
      isFailed: false, isConfirmed: true, appointment_id: "9", loading: false, timedOut: false, checkAgain: vi.fn(),
      payment: { first_name: "Ana" }, data: { service_name: "Hard Gel", appointment_date: "2026-10-20", appointment_time: "9:00 AM" },
    });
    const { container, unmount } = render(<PaymentConfirmation />);
    expect(container.querySelector(".bg-light-orange")).toBeNull();
    expect(screen.getByText("Amount paid").closest(".rounded-2xl")).not.toBeNull();
    unmount();
    confirmation.mockReturnValue({ isFailed: false, isConfirmed: false, appointment_id: "9", loading: false, timedOut: false, checkAgain: vi.fn(), payment: null, data: null });
    render(<PaymentConfirmation />);
    expect(screen.getByRole("status").closest(".rounded-2xl")).toBeNull();
  });
});

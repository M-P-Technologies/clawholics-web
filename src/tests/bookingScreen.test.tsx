import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Booking from "@/views/client/Booking";

const hook = vi.fn();
// The screens draw ClientScreen, which reads the account the client app provides
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/useBooking", () => ({ useBooking: () => hook() }));
vi.mock("@/lib/router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const day = (n: number) => screen.getByRole("button", { name: new RegExp(`\\b${n}(st|nd|rd|th)?,`) });

const state = () => ({
  priceLabel: "₱650", pageData: {} as object | null, isPageLoading: false, pageError: "",
  nailists: [{ id: 1, name: "Max", category_id: 1, image: "" }, { id: 2, name: "Rae", category_id: 2, image: "" }],
  selectedNailist: { id: 1, name: "Max" }, selectedDate: "2026-10-20", selectedTime: "09:00-11:00", setSelectedTime: vi.fn(),
  timeSlots: ["09:00-11:00", "13:00-15:00"], month: thisMonth, setMonth: vi.fn(),
  modalOpen: false, modalTitle: "", modalMessage: "", modalAction: undefined, modalButtonText: "OK",
  service_category: "Gel", service_description: "Long-lasting gel", service_name: "Hard Gel", service_image: "",
  variants: [] as { id: number; name: string; price: number }[], selectedVariantId: null, setSelectedVariantId: vi.fn(),
  selectedAddonIds: [] as number[], setSelectedAddonIds: vi.fn(), addons: [] as { id: number; name: string; price: number }[],
  locationUrl: "https://maps.example/salon", locationText: "Cagayan de Oro",
  isDisabledDate: (d: Date) => d.getDate() === 28,
  formatSlot: (s: string) => (s === "09:00-11:00" ? "9:00 AM - 11:00 AM" : "1:00 PM - 3:00 PM"),
  handleContinue: vi.fn(), isSubmitting: false, sectionLabel: "label-caps",
  handleArtistChange: vi.fn(), handleDateSelect: vi.fn(), selectedDay: new Date(now.getFullYear(), now.getMonth(), 20),
  isDateFullyBooked: () => false, isSlotBlocked: (s: string) => s === "13:00-15:00",
  closeModal: vi.fn(), reloadPage: vi.fn(),
});

let s: ReturnType<typeof state>;
beforeEach(() => {
  s = state();
  hook.mockImplementation(() => s);
});

describe("booking step", () => {
  it("shows the choices in the summary", () => {
    render(<Booking />);
    expect(screen.getByRole("heading", { name: "Book your visit" })).toBeInTheDocument();
    expect(screen.getByText("Hard Gel")).toBeInTheDocument();
    expect(screen.getByText("Gel")).toBeInTheDocument();
    expect(screen.getByText("Long-lasting gel")).toBeInTheDocument();
    const summary = screen.getByText("Preferred artist", { selector: "dt" }).closest("dl")!;
    expect(within(summary).getByText("Max")).toBeInTheDocument();
    expect(within(summary).getByText("2026-10-20")).toBeInTheDocument();
    expect(within(summary).getByText("9:00 AM - 11:00 AM")).toBeInTheDocument();
    expect(within(summary).getByText("₱650")).toBeInTheDocument();
    expect(within(summary).getByRole("link", { name: "Cagayan de Oro" })).toHaveAttribute("href", "https://maps.example/salon");
  });

  it("offers the free time slots and blocks the taken one", () => {
    render(<Booking />);
    expect(screen.getByRole("button", { name: "1:00 PM - 3:00 PM" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "9:00 AM - 11:00 AM" }));
    expect(s.setSelectedTime).toHaveBeenCalledWith("09:00-11:00");
  });

  it("says when there are no times", () => {
    s.timeSlots = [];
    render(<Booking />);
    expect(screen.getByText("No schedule available")).toBeInTheDocument();
  });

  it("blocks unavailable days and picks an open one", () => {
    render(<Booking />);
    expect(day(28)).toBeDisabled();
    fireEvent.click(day(10));
    expect(s.handleDateSelect).toHaveBeenCalled();
  });

  it("picks another artist", () => {
    render(<Booking />);
    fireEvent.click(screen.getByRole("button", { name: "Preferred artist" }));
    fireEvent.click(screen.getByRole("option", { name: /Rae/ }));
    expect(s.handleArtistChange).toHaveBeenCalledWith(2);
  });

  it("says when no artist does this service", () => {
    s.nailists = [];
    render(<Booking />);
    expect(screen.getByText("No available artists for this service.")).toBeInTheDocument();
  });

  it("continues to payment, and can't be pressed twice while reserving", () => {
    const { rerender } = render(<Booking />);
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(s.handleContinue).toHaveBeenCalledTimes(1);
    s = { ...s, isSubmitting: true };
    rerender(<Booking />);
    expect(screen.getByRole("button", { name: "Reserving your slot..." })).toBeDisabled();
  });

  it("shows the option and add-on choices with their prices", () => {
    s.variants = [{ id: 5, name: "Short", price: 500 }];
    s.addons = [{ id: 9, name: "Chrome", price: 150 }];
    render(<Booking />);
    expect(screen.getByText(/choose an option/i)).toBeInTheDocument();
    expect(screen.getByText(/add-ons/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Short/ }));
    expect(s.setSelectedVariantId).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole("checkbox", { name: /Chrome/ }));
    expect(s.setSelectedAddonIds).toHaveBeenCalledWith([9]);
  });

  it("shows the alert the hook asks for", () => {
    s = { ...s, modalOpen: true, modalTitle: "Slot taken", modalMessage: "Someone just booked that time." };
    render(<Booking />);
    expect(screen.getByRole("alertdialog", { name: "Slot taken" })).toHaveTextContent("Someone just booked that time.");
  });

  it("explains a page that didn't load and offers to retry", () => {
    s = { ...s, pageError: "Network down", pageData: null };
    render(<Booking />);
    expect(screen.getByText("We couldn't load the booking page")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(s.reloadPage).toHaveBeenCalled();
  });
});

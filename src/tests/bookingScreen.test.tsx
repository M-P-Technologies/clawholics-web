import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Booking from "@/app/(client)/my/book/page";

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
  priceLabel: "₱650", pageData: {} as object | null, isPageLoading: false, loadingArtists: false, pageError: "",
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
  closeModal: vi.fn(), reloadPage: vi.fn(), contactFields: [], contact: { options: [], value: "", status: "idle", choose: vi.fn(), ready: true, missing: "" },
  rulesHint: "Bookings need at least 2 hours' notice and open up to 30 days ahead.", monthsAhead: 1,
  anyArtist: false, canChooseAnyArtist: true, artistLabel: "Max", loadingAnyDays: false,
});

let s: ReturnType<typeof state>;
beforeEach(() => {
  s = state();
  hook.mockImplementation(() => s);
});

describe("booking step", () => {
  it("loads inside the same frame (title and back button), as placeholders", () => {
    s = { ...s, isPageLoading: true };
    render(<Booking />);
    expect(screen.getByRole("heading", { level: 1, name: "Book" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading booking details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Book your visit" })).toBeNull();
  });

  it("tells the client how much notice a booking needs and how far ahead it can be made", () => {
    render(<Booking />);
    expect(screen.getByText("Bookings need at least 2 hours' notice and open up to 30 days ahead.")).toBeInTheDocument();
  });

  it("shows the artist field as a placeholder while the artists load", () => {
    s = { ...s, loadingArtists: true };
    render(<Booking />);
    expect(screen.getByRole("status", { name: "Loading artists" })).toBeInTheDocument();
  });

  it("shows the booking form and the steps", () => {
    render(<Booking />);
    expect(screen.getByRole("heading", { name: "Book your visit" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Booking steps" })).toBeInTheDocument();
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

  it("offers any available artist first, and chooses it", () => {
    render(<Booking />);
    fireEvent.click(screen.getByRole("button", { name: "Preferred artist" }));
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Any available artist");
    expect(options[0]).toHaveTextContent("We'll assign a free artist");
    fireEvent.click(options[0]);
    expect(s.handleArtistChange).toHaveBeenCalledWith("any");
  });

  it("doesn't offer any artist when only one artist does the service", () => {
    s = { ...s, canChooseAnyArtist: false };
    render(<Booking />);
    fireEvent.click(screen.getByRole("button", { name: "Preferred artist" }));
    expect(screen.queryByRole("option", { name: /Any available artist/ })).toBeNull();
  });

  it("says the times are being found for any available artist, and says the times are being found", () => {
    s = { ...s, anyArtist: true, selectedNailist: null as never, artistLabel: "Any available artist", loadingAnyDays: true };
    render(<Booking />);
    expect(screen.getByText(/Finding the times our artists have free/)).toBeInTheDocument();
  });

  it("says the artists are loading, not that there are none, until they arrive", () => {
    s.nailists = [];
    s.loadingArtists = true;
    render(<Booking />);
    expect(screen.getByText("Loading artists…")).toBeInTheDocument();
    expect(screen.queryByText(/No available artists for this service/)).toBeNull();
  });

  it("asks for a date before saying there is no schedule, and says it once a date is picked", () => {
    s.selectedDate = "";
    s.timeSlots = [];
    const { rerender } = render(<Booking />);
    expect(screen.getByText("Select a date to view available times.")).toBeInTheDocument();
    expect(screen.queryByText("No schedule available")).toBeNull();
    s.selectedDate = "2026-10-31";
    rerender(<Booking />);
    expect(screen.getByText("No schedule available")).toBeInTheDocument();
  });

  it("says when no artist does this service", () => {
    s.nailists = [];
    render(<Booking />);
    expect(screen.getByText(/No available artists for this service/)).toBeInTheDocument();
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

  it("asks for the primary contact, and for just the handle that choice needs", () => {
    const onBlur = vi.fn();
    s.contact = { options: [{ value: "call", label: "Call" }, { value: "facebook", label: "Messenger (add yours)" }], value: "messenger", status: "idle", choose: vi.fn(), ready: false, missing: "" } as never;
    s.contactFields = [
      { id: "booking-facebook", name: "facebook_handle", label: "Facebook", type: "text", autoComplete: "off", maxLength: 100, value: "Ana Cruz", status: "saved", onChange: vi.fn(), onBlur },
    ] as never;
    render(<Booking />);
    expect(screen.getByRole("heading", { name: "How can we reach you?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primary contact" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Instagram/)).not.toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: /Facebook/ });
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
    expect(screen.getByText("Saved to your profile")).toBeInTheDocument();
  });

  it("leaves the section out when there is no way to reach them to choose from", () => {
    render(<Booking />);
    expect(screen.queryByRole("heading", { name: "How can we reach you?" })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateAppointmentDialog from "@/components/features/admin/bookings/CreateAppointmentDialog";

// The modal is one form (no steps, no walk-in/registered switch, no toasts: the caller toasts after
// onCreated). Its date and time block is drawn twice (phone and desktop position), so those controls
// are looked up with getAllBy and acted on through the first copy.

const booking = {
  createAdminAppointment: vi.fn(),
  fetchBookedSlotsDetailed: vi.fn(),
  fetchBookedSlotsRange: vi.fn(),
  fetchNailists: vi.fn(),
};
const fetchServices = vi.fn();
const nailistApi = {
  fetchNailistDayOffs: vi.fn(),
  fetchNailistTimeSlots: vi.fn(),
};

vi.mock("@/services/bookingService", () => ({
  createAdminAppointment: (...a: unknown[]) => booking.createAdminAppointment(...a),
  fetchBookedSlotsDetailed: (...a: unknown[]) => booking.fetchBookedSlotsDetailed(...a),
  fetchBookedSlotsRange: (...a: unknown[]) => booking.fetchBookedSlotsRange(...a),
  fetchNailists: (...a: unknown[]) => booking.fetchNailists(...a),
}));
vi.mock("@/services/serviceService", () => ({ fetchServices: (...a: unknown[]) => fetchServices(...a) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: (...a: unknown[]) => nailistApi.fetchNailistDayOffs(...a),
  fetchNailistTimeSlots: (...a: unknown[]) => nailistApi.fetchNailistTimeSlots(...a),
}));

const nailists = [
  { id: 1, name: "Mara", category_id: 1 },
  { id: 2, name: "Jun", category_id: 2 },
];
const services = [
  { id: 10, name: "Gel Polish", master_price: 800, junior_price: 500, duration: "60", nailist_ids: "1,2" },
  { id: 11, name: "Nail Art", master_price: 1200, junior_price: 900, duration: "90", nailist_ids: "1" },
  { id: 12, name: "Pedicure", master_price: 700, junior_price: 450, duration: "45", nailist_ids: "2" },
  { id: 13, name: "Unassigned", master_price: 100, junior_price: 50, duration: "30" },
];

// "Today" is Wednesday 2026-10-14. Mara: Sundays off, 2026-10-16 off, 10-15 has 9-10 taken,
// 10-20 is fully booked. Jun works two slots, has her own days off
// (Wednesdays and 10-19) and has 3-4 PM taken on 10-15.
const slotsFor: Record<number, unknown[]> = {
  1: ["09:00-10:00", "10:00-11:00", "13:00-14:00"],
  2: ["15:00-16:00", "17:00-18:00"],
};
let bookedBy: Record<number, Record<string, string[]>> = {};
const dayOffsFor: Record<number, unknown> = {
  1: { regularDays: [0], customDates: ["2026-10-16"] },
  2: { regularDays: [3], customDates: ["2026-10-19"] },
};

const fetchMock = vi.fn();

const okJson = (data: unknown) => ({ ok: true, json: async () => data });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14, 10, 0, 0) });
  vi.spyOn(console, "error").mockImplementation(() => {});
  bookedBy = {
    1: { "2026-10-15": ["09:00-10:00"], "2026-10-20": ["09:00-11:00", "13:00-14:00"] },
    2: { "2026-10-15": ["15:00-16:00"] },
  };
  fetchMock.mockReset().mockResolvedValue(okJson(services));
  vi.stubGlobal("fetch", fetchMock);
  booking.fetchNailists.mockReset().mockResolvedValue(nailists);
  booking.fetchBookedSlotsDetailed.mockReset().mockImplementation(async (id: number, date: string) =>
    (bookedBy[id]?.[date] ?? []).map((appointment_time) => ({ appointment_time })),
  );
  // The month's taken times, in one request
  booking.fetchBookedSlotsRange.mockReset().mockImplementation(async (id: number, from: string, to: string) =>
    Object.entries(bookedBy[id] ?? {})
      .filter(([date]) => date >= from && date <= to)
      .flatMap(([appointment_date, times]) => times.map((appointment_time) => ({ appointment_date, appointment_time }))),
  );
  fetchServices.mockReset().mockResolvedValue(services);
  booking.createAdminAppointment.mockReset().mockResolvedValue({ success: true });
  nailistApi.fetchNailistTimeSlots.mockReset().mockImplementation(async (id: number) => slotsFor[id]);
  nailistApi.fetchNailistDayOffs.mockReset().mockImplementation(async (id: number) => dayOffsFor[id]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderModal = async () => {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const view = render(<CreateAppointmentDialog onClose={onClose} onCreated={onCreated} />);
  await waitFor(() => expect(artistSelect()).toBeEnabled());
  await waitFor(() => expect(serviceSelect()).toBeEnabled());
  return { onClose, onCreated, ...view };
};

// The two selects are the site's own listbox (a button that opens a list of options): the artist
// one comes first, the service one second.
const listboxes = () => screen.getAllByRole("button").filter((b) => b.getAttribute("aria-haspopup") === "listbox");
const artistSelect = () => listboxes()[0];
const serviceSelect = () => listboxes()[1];
const optionsOf = (select: HTMLElement) => {
  fireEvent.click(select);
  const names = screen.getAllByRole("option").map((o) => o.textContent);
  fireEvent.click(select);
  return names;
};
const choose = (select: HTMLElement, name: string) => {
  fireEvent.click(select);
  fireEvent.click(screen.getByRole("option", { name }));
};

const chooseArtist = async (name: string) => {
  choose(artistSelect(), name);
  await waitFor(() => expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument());
};
const chooseService = (name: string) => choose(serviceSelect(), name);
const dayButtons = (pattern: RegExp) => screen.getAllByRole("button", { name: pattern });
// `copy` is which of the two date-and-time blocks (phone position 0, desktop position 1) is used
const pickDate = async (pattern: RegExp, copy = 0) => {
  fireEvent.click(dayButtons(pattern)[copy]);
  await waitFor(() => expect(summaryValue("Date")).not.toBe("–"));
};
const timeButtons = (pattern: RegExp) => screen.getAllByRole("button", { name: pattern });
const pickTime = (pattern: RegExp, copy = 0) => fireEvent.click(timeButtons(pattern)[copy]);

const fillClient = (first = "Ana", last = "Cruz", phone = "09171234567", email = "") => {
  fireEvent.change(screen.getByPlaceholderText("First name"), { target: { value: first } });
  fireEvent.change(screen.getByPlaceholderText("Last name"), { target: { value: last } });
  fireEvent.change(screen.getByPlaceholderText("Phone number"), { target: { value: phone } });
  if (email) fireEvent.change(screen.getByPlaceholderText("Email address (optional)"), { target: { value: email } });
};

const summaryValue = (label: string) => {
  const summary = screen.getByRole("heading", { name: "Summary" }).parentElement as HTMLElement;
  const row = within(summary).getByText(label, { selector: "dt" }).parentElement as HTMLElement;
  return row.lastElementChild!.textContent;
};

const renderModalWithAll = async () => {
  const handlers = await renderModal();
  fillClient("  Ana ", " Cruz", "09171234567", " ana@x.com ");
  await chooseArtist("Mara");
  chooseService("Nail Art");
  await pickDate(/October 15th, 2026/);
  pickTime(/10:00 AM - 11:00 AM/);
  return handlers;
};

describe("CreateAppointmentDialog: opening and closing", () => {
  it("shows the heading, the client form, empty selects and an empty summary", async () => {
    await renderModal();
    expect(screen.getByRole("heading", { name: "Create appointment" })).toBeInTheDocument();
    expect(screen.getByText("A walk-in or phone booking: the client, the artist and service, then a free slot.")).toBeInTheDocument();
    for (const placeholder of ["First name", "Last name", "Phone number", "Email address (optional)"]) {
      expect(screen.getByPlaceholderText(placeholder)).toHaveValue("");
    }
    expect(artistSelect()).toHaveTextContent("Select nail artist");
    expect(serviceSelect()).toHaveTextContent("Select service");
    expect(screen.getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    for (const label of ["Service", "Artist", "Date", "Time", "Price"]) expect(summaryValue(label)).toBe("–");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("loads the services and every artist (the queries the booking pages share)", async () => {
    await renderModal();
    expect(fetchServices).toHaveBeenCalledTimes(1);
    expect(booking.fetchNailists).toHaveBeenCalledWith(0);
    expect(optionsOf(artistSelect())).toEqual(["Select nail artist", "Mara", "Jun"]);
    expect(optionsOf(serviceSelect())).toEqual(["Select service", "Gel Polish", "Nail Art", "Pedicure", "Unassigned"]);
  });

  it("calls onClose from the Close button and from Cancel, and creates nothing", async () => {
    const { onClose, onCreated } = await renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onCreated).not.toHaveBeenCalled();
    expect(booking.createAdminAppointment).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not when the panel is", async () => {
    const { onClose } = await renderModal();
    fireEvent.click(screen.getByRole("heading", { name: "Create appointment" }));
    fireEvent.click(screen.getByPlaceholderText("First name"));
    expect(onClose).not.toHaveBeenCalled();
    // the backdrop is the dialog panel's parent (Dialog)
    fireEvent.click(screen.getByRole("dialog", { name: "Create appointment" }).parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is a modal dialog named by its title, with focus moved inside on open", async () => {
    await renderModal();
    const dialog = screen.getByRole("dialog", { name: "Create appointment" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("opens with focus on the First name field", async () => {
    await renderModal();
    expect(screen.getByPlaceholderText("First name")).toHaveFocus();
  });

  it("calls onClose once on Escape", async () => {
    const { onClose } = await renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can still be closed by Close, Escape and the backdrop while the booking is sent (only Cancel is locked)", async () => {
    booking.createAdminAppointment.mockReturnValue(new Promise(() => {}));
    const { onClose } = await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await screen.findByRole("button", { name: /Creating/ });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog", { name: "Create appointment" }).parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe("CreateAppointmentDialog: loading and loading failures", () => {
  it("disables the selects and says Loading while the artists and services load", async () => {
    booking.fetchNailists.mockReturnValue(new Promise(() => {}));
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CreateAppointmentDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(artistSelect()).toHaveTextContent("Loading nail artists...");
    expect(serviceSelect()).toHaveTextContent("Loading services...");
    expect(artistSelect()).toBeDisabled();
    expect(serviceSelect()).toBeDisabled();
  });

  it("enables the selects once they have loaded", async () => {
    await renderModal();
    expect(artistSelect()).toBeEnabled();
    expect(serviceSelect()).toBeEnabled();
  });

  it("shows a message when the services can't be loaded", async () => {
    fetchServices.mockRejectedValue(new Error("down"));
    render(<CreateAppointmentDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load services.");
    expect(serviceSelect()).toHaveTextContent("Select service");
  });

  it("shows a message when the artists can't be loaded", async () => {
    booking.fetchNailists.mockRejectedValue(new Error("down"));
    render(<CreateAppointmentDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load nail artists.");
    expect(artistSelect()).toHaveTextContent("Select nail artist");
  });

  it("shows a message when an artist's availability can't be loaded", async () => {
    nailistApi.fetchNailistTimeSlots.mockRejectedValue(new Error("nope"));
    await renderModal();
    choose(artistSelect(), "Mara");
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load nail artist availability.");
  });

  it("shows Loading availability while the artist's schedule loads", async () => {
    await renderModal();
    nailistApi.fetchNailistTimeSlots.mockReturnValue(new Promise(() => {}));
    choose(artistSelect(), "Mara");
    expect((await screen.findAllByText("Loading availability...")).length).toBeGreaterThan(0);
  });

  it("shows a message when the booked slots of a chosen date can't be loaded", async () => {
    await renderModal();
    await chooseArtist("Mara");
    booking.fetchBookedSlotsDetailed.mockImplementation(async (_id: number, date: string) => {
      if (date === "2026-10-15") throw new Error("x");
      return [];
    });
    fireEvent.click(dayButtons(/October 15th, 2026/)[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Failed to load booked slots."));
  });
});

describe("CreateAppointmentDialog: client fields", () => {
  it("accepts only digits in the phone number, up to 11", async () => {
    await renderModal();
    const phone = screen.getByPlaceholderText("Phone number");
    fireEvent.change(phone, { target: { value: "0917" } });
    expect(phone).toHaveValue("0917");
    fireEvent.change(phone, { target: { value: "0917abc" } });
    expect(phone).toHaveValue("0917");
    fireEvent.change(phone, { target: { value: "091712345678" } });
    expect(phone).toHaveValue("0917");
    fireEvent.change(phone, { target: { value: "09171234567" } });
    expect(phone).toHaveValue("09171234567");
  });

  it("keeps what is typed in the name and email fields", async () => {
    await renderModal();
    fillClient("Ana", "Cruz", "0917", "ana@x.com");
    expect(screen.getByPlaceholderText("First name")).toHaveValue("Ana");
    expect(screen.getByPlaceholderText("Last name")).toHaveValue("Cruz");
    expect(screen.getByPlaceholderText("Email address (optional)")).toHaveValue("ana@x.com");
  });
});

describe("CreateAppointmentDialog: artist and service", () => {
  it("offers every service until an artist is chosen, then only that artist's services", async () => {
    await renderModal();
    await chooseArtist("Jun");
    expect(optionsOf(serviceSelect())).toEqual(["Select service", "Gel Polish", "Pedicure"]);
    await chooseArtist("Mara");
    expect(optionsOf(serviceSelect())).toEqual(["Select service", "Gel Polish", "Nail Art"]);
  });

  it("goes back to every service when the artist is cleared", async () => {
    await renderModal();
    await chooseArtist("Jun");
    choose(artistSelect(), "Select nail artist");
    await waitFor(() => expect(optionsOf(serviceSelect())).toHaveLength(5));
  });

  it("clears the chosen service when the artist changes", async () => {
    await renderModal();
    await chooseArtist("Mara");
    chooseService("Gel Polish");
    expect(serviceSelect()).toHaveTextContent("Gel Polish");
    expect(summaryValue("Service")).toBe("Gel Polish");
    await chooseArtist("Jun");
    expect(serviceSelect()).toHaveTextContent("Select service");
    expect(summaryValue("Service")).toBe("–");
  });

  it("loads the chosen artist's time slots and days off", async () => {
    await renderModal();
    await chooseArtist("Mara");
    expect(nailistApi.fetchNailistTimeSlots).toHaveBeenCalledWith(1);
    expect(nailistApi.fetchNailistDayOffs).toHaveBeenCalledWith(1);
  });
});

describe("CreateAppointmentDialog: date and time", () => {
  it("asks for an artist before showing any time", async () => {
    await renderModal();
    expect(screen.getAllByText("Select a nail artist to view available time slots.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /AM/ })).not.toBeInTheDocument();
  });

  it("asks for a date once an artist is chosen", async () => {
    await renderModal();
    await chooseArtist("Mara");
    expect(screen.getAllByText("Select a date first.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Select a nail artist to view available time slots.")).not.toBeInTheDocument();
  });

  it("says there is no schedule for an artist without time slots", async () => {
    slotsFor[1] = [];
    try {
      await renderModal();
      await chooseArtist("Mara");
      await pickDate(/October 15th, 2026/);
      expect(screen.getAllByText("No schedule available.").length).toBeGreaterThan(0);
    } finally {
      slotsFor[1] = ["09:00-10:00", "10:00-11:00", "13:00-14:00"];
    }
  });

  it("disables the artist's regular and one-off days off and the fully booked day", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await waitFor(() => expect(dayButtons(/October 20th, 2026/)[0]).toBeDisabled());
    expect(dayButtons(/October 18th, 2026/)[0]).toBeDisabled(); // a Sunday
    expect(dayButtons(/October 16th, 2026/)[0]).toBeDisabled(); // a one-off day off
    expect(dayButtons(/October 15th, 2026/)[0]).toBeEnabled();
    expect(dayButtons(/October 19th, 2026/)[0]).toBeEnabled();
  });

  it("checks the month for booked slots of the chosen artist, in one request", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await waitFor(() => expect(booking.fetchBookedSlotsRange).toHaveBeenCalledWith(1, "2026-10-14", "2026-11-14"));
    expect(booking.fetchBookedSlotsRange).toHaveBeenCalledTimes(1);
  });

  it("offers each of the artist's slots formatted, and blocks the one that is taken", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    expect(timeButtons(/10:00 AM - 11:00 AM/)[0]).toBeEnabled();
    expect(timeButtons(/1:00 PM - 2:00 PM/)[0]).toBeEnabled();
    expect(booking.fetchBookedSlotsDetailed).toHaveBeenCalledWith(1, "2026-10-15");
  });

  it("does not choose a blocked time", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    fireEvent.click(timeButtons(/9:00 AM - 10:00 AM/)[0]);
    expect(summaryValue("Time")).toBe("–");
  });

  it("marks the chosen time as pressed and shows it in the summary", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    pickTime(/1:00 PM - 2:00 PM/);
    expect(timeButtons(/1:00 PM - 2:00 PM/)[0]).toHaveAttribute("aria-pressed", "true");
    expect(timeButtons(/10:00 AM - 11:00 AM/)[0]).toHaveAttribute("aria-pressed", "false");
    expect(summaryValue("Time")).toBe("1:00 PM - 2:00 PM");
  });

  it("drops the chosen date and time when the artist changes", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    pickTime(/10:00 AM - 11:00 AM/);
    expect(summaryValue("Date")).toBe("2026-10-15");
    expect(summaryValue("Time")).toBe("10:00 AM - 11:00 AM");
    await chooseArtist("Jun");
    expect(summaryValue("Date")).toBe("–");
    expect(summaryValue("Time")).toBe("–");
    expect(screen.getAllByText("Select a date first.").length).toBeGreaterThan(0);
  });

  it("drops the chosen time when another date is picked", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    pickTime(/10:00 AM - 11:00 AM/);
    await pickDate(/October 19th, 2026/);
    await waitFor(() => expect(summaryValue("Date")).toBe("2026-10-19"));
    expect(summaryValue("Time")).toBe("–");
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeEnabled());
  });
});

describe("CreateAppointmentDialog: the two date-and-time blocks, per-artist slots and days off", () => {
  it("draws the date and time block twice, and both copies show the same choice", async () => {
    await renderModal();
    await chooseArtist("Mara");
    expect(screen.getAllByRole("heading", { name: "Date and time" })).toHaveLength(2);
    await pickDate(/October 15th, 2026/, 1);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    expect(timeButtons(/10:00 AM - 11:00 AM/)).toHaveLength(2);
    pickTime(/10:00 AM - 11:00 AM/, 1);
    expect(timeButtons(/10:00 AM - 11:00 AM/)[0]).toHaveAttribute("aria-pressed", "true");
    expect(timeButtons(/10:00 AM - 11:00 AM/)[1]).toHaveAttribute("aria-pressed", "true");
    expect(timeButtons(/1:00 PM - 2:00 PM/)[0]).toHaveAttribute("aria-pressed", "false");
    expect(summaryValue("Date")).toBe("2026-10-15");
    expect(summaryValue("Time")).toBe("10:00 AM - 11:00 AM");
    // and a time picked through the first copy shows in the second
    pickTime(/1:00 PM - 2:00 PM/, 0);
    expect(timeButtons(/1:00 PM - 2:00 PM/)[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("looks up the booked slots of the chosen artist and date, then of the new artist and date", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await waitFor(() => expect(dayButtons(/October 20th, 2026/)[0]).toBeDisabled());
    booking.fetchBookedSlotsDetailed.mockClear();
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[0]).toBeDisabled());
    // Asked once, fresh, and the day's time list uses that answer
    expect(booking.fetchBookedSlotsDetailed.mock.calls).toEqual([[1, "2026-10-15"]]);
    expect(timeButtons(/10:00 AM - 11:00 AM/)[0]).toBeEnabled();

    await chooseArtist("Jun");
    await waitFor(() => expect(dayButtons(/October 19th, 2026/)[0]).toBeDisabled());
    booking.fetchBookedSlotsDetailed.mockClear();
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(timeButtons(/3:00 PM - 4:00 PM/)[0]).toBeDisabled());
    expect(booking.fetchBookedSlotsDetailed.mock.calls).toEqual([[2, "2026-10-15"]]);
    expect(timeButtons(/5:00 PM - 6:00 PM/)[0]).toBeEnabled();
    expect(screen.queryByRole("button", { name: /9:00 AM - 10:00 AM/ })).not.toBeInTheDocument();
  });

  it("applies each artist's own days off", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await waitFor(() => expect(dayButtons(/October 16th, 2026/)[0]).toBeDisabled());
    expect(dayButtons(/October 19th, 2026/)[0]).toBeEnabled();
    expect(dayButtons(/October 21st, 2026/)[0]).toBeEnabled(); // a Wednesday
    expect(dayButtons(/October 18th, 2026/)[0]).toBeDisabled(); // a Sunday

    await chooseArtist("Jun");
    await waitFor(() => expect(dayButtons(/October 19th, 2026/)[0]).toBeDisabled());
    expect(dayButtons(/October 16th, 2026/)[0]).toBeEnabled();
    expect(dayButtons(/October 18th, 2026/)[0]).toBeEnabled();
    expect(dayButtons(/October 21st, 2026/)[0]).toBeDisabled();
    expect(nailistApi.fetchNailistDayOffs).toHaveBeenLastCalledWith(2);
  });
});

describe("CreateAppointmentDialog: summary and price", () => {
  it("shows the master price for a master artist", async () => {
    await renderModal();
    await chooseArtist("Mara");
    chooseService("Gel Polish");
    expect(summaryValue("Price")).toBe("₱800");
  });

  it("shows the junior price for any other artist", async () => {
    await renderModal();
    await chooseArtist("Jun");
    chooseService("Gel Polish");
    expect(summaryValue("Price")).toBe("₱500");
  });

  it("shows no price until both an artist and a service are chosen", async () => {
    await renderModal();
    chooseService("Gel Polish");
    expect(summaryValue("Service")).toBe("Gel Polish");
    expect(summaryValue("Price")).toBe("–");
  });

  it("lists the chosen service, artist, date, time and price", async () => {
    await renderModalWithAll();
    expect(summaryValue("Service")).toBe("Nail Art");
    expect(summaryValue("Artist")).toBe("Mara");
    expect(summaryValue("Date")).toBe("2026-10-15");
    expect(summaryValue("Time")).toBe("10:00 AM - 11:00 AM");
    expect(summaryValue("Price")).toBe("₱1200");
  });
});

describe("CreateAppointmentDialog: submitting", () => {
  it("books the appointment with the trimmed client details and the chosen options", async () => {
    const { onCreated, onClose } = await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(booking.createAdminAppointment).toHaveBeenCalledTimes(1);
    expect(booking.createAdminAppointment).toHaveBeenCalledWith({
      first_name: "Ana",
      last_name: "Cruz",
      phone: "09171234567",
      email: "ana@x.com",
      service_id: 11,
      service_name: "Nail Art",
      nailist_id: 1,
      nailist_name: "Mara",
      appointment_date: "2026-10-15",
      appointment_time: "10:00-11:00",
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("books with the date and time picked through the second date-and-time block", async () => {
    const { onCreated } = await renderModal();
    fillClient("Ana", "Cruz", "09171234567");
    await chooseArtist("Mara");
    chooseService("Nail Art");
    await pickDate(/October 15th, 2026/, 1);
    await waitFor(() => expect(timeButtons(/9:00 AM - 10:00 AM/)[1]).toBeDisabled());
    pickTime(/1:00 PM - 2:00 PM/, 1);
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(booking.createAdminAppointment).toHaveBeenCalledWith({
      first_name: "Ana",
      last_name: "Cruz",
      phone: "09171234567",
      email: "",
      service_id: 11,
      service_name: "Nail Art",
      nailist_id: 1,
      nailist_name: "Mara",
      appointment_date: "2026-10-15",
      appointment_time: "13:00-14:00",
    });
  });

  it("sends an empty email when none is given", async () => {
    const { onCreated } = await renderModal();
    fillClient();
    await chooseArtist("Jun");
    chooseService("Pedicure");
    await pickDate(/October 15th, 2026/);
    pickTime(/5:00 PM - 6:00 PM/);
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(booking.createAdminAppointment).toHaveBeenCalledWith({
      first_name: "Ana",
      last_name: "Cruz",
      phone: "09171234567",
      email: "",
      service_id: 12,
      service_name: "Pedicure",
      nailist_id: 2,
      nailist_name: "Jun",
      appointment_date: "2026-10-15",
      appointment_time: "17:00-18:00",
    });
  });

  it("checks the date's booked slots again just before booking", async () => {
    const { onCreated } = await renderModalWithAll();
    booking.fetchBookedSlotsDetailed.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(booking.fetchBookedSlotsDetailed).toHaveBeenCalledWith(1, "2026-10-15");
  });

  it("disables Cancel and shows Creating… while the booking is sent, and ignores a second click", async () => {
    let finish: (v: unknown) => void = () => {};
    booking.createAdminAppointment.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { onCreated } = await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    const busy = await screen.findByRole("button", { name: /Creating/ });
    expect(busy).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.click(busy);
    expect(booking.createAdminAppointment).toHaveBeenCalledTimes(1);
    finish({ success: true });
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Create appointment" })).toBeEnabled();
  });

  it("asks for the missing fields and books nothing", async () => {
    const { onCreated } = await renderModal();
    fillClient("Ana", "Cruz", "");
    await chooseArtist("Mara");
    chooseService("Nail Art");
    await pickDate(/October 15th, 2026/);
    pickTime(/10:00 AM - 11:00 AM/);
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields.");
    expect(booking.createAdminAppointment).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it.each([
    ["the first name", () => fillClient("  ", "Cruz", "0917")],
    ["the last name", () => fillClient("Ana", "", "0917")],
  ])("asks for %s when it is blank", async (_name, fill) => {
    await renderModal();
    fill();
    await chooseArtist("Mara");
    chooseService("Nail Art");
    await pickDate(/October 15th, 2026/);
    pickTime(/10:00 AM - 11:00 AM/);
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields.");
    expect(booking.createAdminAppointment).not.toHaveBeenCalled();
  });

  it.each([
    ["an artist", async () => {}],
    ["a service", async () => { await chooseArtist("Mara"); }],
    ["a date", async () => { await chooseArtist("Mara"); chooseService("Nail Art"); }],
    ["a time", async () => { await chooseArtist("Mara"); chooseService("Nail Art"); await pickDate(/October 15th, 2026/); }],
  ])("asks for the rest when there is no %s", async (_name, choose) => {
    await renderModal();
    fillClient();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields.");
    expect(booking.createAdminAppointment).not.toHaveBeenCalled();
  });

  it("clears the message when a date is picked", async () => {
    await renderModal();
    await chooseArtist("Mara");
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await pickDate(/October 15th, 2026/);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("refuses a time that was taken meanwhile, clears it and keeps the other choices", async () => {
    const { onCreated } = await renderModalWithAll();
    bookedBy[1]["2026-10-15"] = ["09:00-10:00", "10:30-11:30"];
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This time slot was just booked. Please select another.");
    expect(booking.createAdminAppointment).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(summaryValue("Time")).toBe("–");
    expect(summaryValue("Date")).toBe("2026-10-15");
    expect(summaryValue("Service")).toBe("Nail Art");
    expect(summaryValue("Artist")).toBe("Mara");
    expect(screen.getByPlaceholderText("First name")).toHaveValue("  Ana ");
  });

  it("shows the error and keeps the modal and every choice when booking fails", async () => {
    booking.createAdminAppointment.mockRejectedValue(new Error("Server exploded"));
    const { onCreated, onClose } = await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to create appointment.");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Create appointment" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toHaveValue("  Ana ");
    expect(screen.getByPlaceholderText("Last name")).toHaveValue(" Cruz");
    expect(screen.getByPlaceholderText("Phone number")).toHaveValue("09171234567");
    expect(screen.getByPlaceholderText("Email address (optional)")).toHaveValue("ana@x.com");
    expect(artistSelect()).toHaveTextContent("Mara");
    expect(serviceSelect()).toHaveTextContent("Nail Art");
    expect(summaryValue("Date")).toBe("2026-10-15");
    expect(summaryValue("Time")).toBe("10:00 AM - 11:00 AM");
    expect(screen.getByRole("button", { name: "Create appointment" })).toBeEnabled();
  });

  it.each(["SLOT_TAKEN", "The slot is gone"])("explains a taken slot when the server says %s", async (code) => {
    booking.createAdminAppointment.mockRejectedValue(new Error(code));
    await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This appointment slot has already been taken by another active appointment.",
    );
  });

  it("can book again after a failure", async () => {
    booking.createAdminAppointment.mockRejectedValueOnce(new Error("x"));
    const { onCreated } = await renderModalWithAll();
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Create appointment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(booking.createAdminAppointment).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

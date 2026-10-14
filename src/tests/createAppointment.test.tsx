import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateAppointmentModal from "@/components/features/admin/bookings/CreateAppointmentModal";

// The modal is one form (no steps, no walk-in/registered switch, no toasts: the caller toasts after
// onCreated). Its date and time block is drawn twice (phone and desktop position), so those controls
// are looked up with getAllBy and acted on through the first copy.

const booking = {
  createAdminAppointment: vi.fn(),
  fetchBookedSlotsDetailed: vi.fn(),
  fetchNailists: vi.fn(),
};
const nailistApi = {
  fetchNailistDayOffs: vi.fn(),
  fetchNailistTimeSlots: vi.fn(),
};

vi.mock("@/services/bookingService", () => ({
  createAdminAppointment: (...a: unknown[]) => booking.createAdminAppointment(...a),
  fetchBookedSlotsDetailed: (...a: unknown[]) => booking.fetchBookedSlotsDetailed(...a),
  fetchNailists: (...a: unknown[]) => booking.fetchNailists(...a),
}));
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
// 10-20 is fully booked. Jun works one slot given as an object.
const slotsFor: Record<number, unknown[]> = {
  1: ["09:00-10:00", "10:00-11:00", "13:00-14:00"],
  2: [{ start_time: "15:00", end_time: "16:00" }],
};
let bookedByDate: Record<string, string[]> = {};

const fetchMock = vi.fn();

const okJson = (data: unknown) => ({ ok: true, json: async () => data });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14, 10, 0, 0) });
  vi.spyOn(console, "error").mockImplementation(() => {});
  bookedByDate = { "2026-10-15": ["09:00-10:00"], "2026-10-20": ["09:00-11:00", "13:00-14:00"] };
  fetchMock.mockReset().mockResolvedValue(okJson(services));
  vi.stubGlobal("fetch", fetchMock);
  booking.fetchNailists.mockReset().mockResolvedValue(nailists);
  booking.fetchBookedSlotsDetailed.mockReset().mockImplementation(async (_id: number, date: string) =>
    (bookedByDate[date] ?? []).map((appointment_time) => ({ appointment_time })),
  );
  booking.createAdminAppointment.mockReset().mockResolvedValue({ success: true });
  nailistApi.fetchNailistTimeSlots.mockReset().mockImplementation(async (id: number) => slotsFor[id]);
  nailistApi.fetchNailistDayOffs.mockReset().mockResolvedValue({ regularDays: [0], customDates: ["2026-10-16"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderModal = async () => {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const view = render(<CreateAppointmentModal onClose={onClose} onCreated={onCreated} />);
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
const pickDate = async (pattern: RegExp, bookedCalls?: number) => {
  fireEvent.click(dayButtons(pattern)[0]);
  await waitFor(() => expect(screen.getAllByText("Time").length).toBeGreaterThan(0));
  if (bookedCalls !== undefined) await waitFor(() => expect(booking.fetchBookedSlotsDetailed.mock.calls.length).toBeGreaterThanOrEqual(bookedCalls));
};
const timeButtons = (pattern: RegExp) => screen.getAllByRole("button", { name: pattern });
const pickTime = (pattern: RegExp) => fireEvent.click(timeButtons(pattern)[0]);

const fillClient = (first = "Ana", last = "Cruz", phone = "09171234567", email = "") => {
  fireEvent.change(screen.getByPlaceholderText("First name"), { target: { value: first } });
  fireEvent.change(screen.getByPlaceholderText("Last name"), { target: { value: last } });
  fireEvent.change(screen.getByPlaceholderText("Phone number"), { target: { value: phone } });
  if (email) fireEvent.change(screen.getByPlaceholderText("Email address (optional)"), { target: { value: email } });
};

const summaryValue = (label: string) => {
  const summary = screen.getByRole("heading", { name: "Summary" }).parentElement as HTMLElement;
  const row = within(summary).getByText(label, { selector: "p" }).parentElement as HTMLElement;
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

describe("CreateAppointmentModal: opening and closing", () => {
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

  it("loads the services with the frontend origin header and the artists from the booking service", async () => {
    await renderModal();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/services$/);
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { "x-clawholics-origin": "frontend" } });
    expect(booking.fetchNailists).toHaveBeenCalledWith();
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
    const { onClose, container } = await renderModal();
    fireEvent.click(screen.getByRole("heading", { name: "Create appointment" }));
    fireEvent.click(screen.getByPlaceholderText("First name"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("CreateAppointmentModal: loading and loading failures", () => {
  it("disables the selects and says Loading while the artists and services load", async () => {
    booking.fetchNailists.mockReturnValue(new Promise(() => {}));
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CreateAppointmentModal onClose={vi.fn()} onCreated={vi.fn()} />);
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
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<CreateAppointmentModal onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load services.");
    expect(serviceSelect()).toHaveTextContent("Select service");
  });

  it("shows a message when the artists can't be loaded", async () => {
    booking.fetchNailists.mockRejectedValue(new Error("down"));
    render(<CreateAppointmentModal onClose={vi.fn()} onCreated={vi.fn()} />);
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
    // the click's own lookup answers; the lookup that follows the date change fails
    let calls = 0;
    booking.fetchBookedSlotsDetailed.mockImplementation(async (_id: number, date: string) => {
      if (date === "2026-10-15" && ++calls === 2) throw new Error("x");
      return [];
    });
    fireEvent.click(dayButtons(/October 15th, 2026/)[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Failed to load booked slots."));
  });
});

describe("CreateAppointmentModal: client fields", () => {
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

describe("CreateAppointmentModal: artist and service", () => {
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

describe("CreateAppointmentModal: date and time", () => {
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

  it("checks the month for booked slots of the chosen artist, day by day", async () => {
    await renderModal();
    await chooseArtist("Mara");
    await waitFor(() => expect(booking.fetchBookedSlotsDetailed).toHaveBeenCalledWith(1, "2026-10-20"));
    expect(booking.fetchBookedSlotsDetailed).toHaveBeenCalledWith(1, "2026-10-14");
    expect(booking.fetchBookedSlotsDetailed).toHaveBeenCalledWith(1, "2026-11-14");
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

  it("reads an artist's slots given as start and end times", async () => {
    await renderModal();
    await chooseArtist("Jun");
    await pickDate(/October 15th, 2026/);
    expect(timeButtons(/3:00 PM - 4:00 PM/)[0]).toBeEnabled();
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

describe("CreateAppointmentModal: summary and price", () => {
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

describe("CreateAppointmentModal: submitting", () => {
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

  it("sends an empty email when none is given", async () => {
    const { onCreated } = await renderModal();
    fillClient();
    await chooseArtist("Jun");
    chooseService("Pedicure");
    await pickDate(/October 15th, 2026/);
    pickTime(/3:00 PM - 4:00 PM/);
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
      appointment_time: "15:00-16:00",
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
    bookedByDate["2026-10-15"] = ["09:00-10:00", "10:30-11:30"];
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

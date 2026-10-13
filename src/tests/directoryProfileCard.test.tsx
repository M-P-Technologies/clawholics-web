import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DirectoryProfileCard, { type DirectoryUser } from "@/components/admin/DirectoryProfileCard";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const ana: DirectoryUser = {
  id: "user_ana", clerk_id: "user_ana", user_id: 7, firstName: "ana", lastName: "cruz", email: "ana@x.test", phoneNumber: "0917 123 4567",
  altPhone: "0918 555 0000", instagramHandle: "@anacruz", facebookHandle: "ana.cruz", preferredContactMethod: "Instagram", role: "Client",
  visit_count: 4, last_visit: "2026-10-05 05:00:00", is_recurring: true,
};
const profile = { imageUrl: "https://img.clerk.com/ana.png", joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: "2026-10-10T02:00:00.000Z" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-12T02:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const stat = (label: string) => within(screen.getByRole("list", { name: "At a glance" })).getByText(label).nextElementSibling;

describe("DirectoryProfileCard", () => {
  it("shows a round photo over a blush banner, the name and the role", () => {
    render(<DirectoryProfileCard user={ana} profile={profile} />);
    const card = within(screen.getByRole("region", { name: "Ana Cruz" }));
    const photo = card.getByRole("img", { name: "Ana Cruz" });
    expect(photo).toHaveAttribute("src", "https://img.clerk.com/ana.png");
    expect(photo).toHaveClass("aspect-square", "rounded-full", "ring-4", "ring-milk");
    const banner = card.getByTestId("banner");
    // the photo sits over the banner's bottom edge
    expect(banner.compareDocumentPosition(photo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(photo.parentElement).toHaveClass("-mt-12");
    expect(card.getByRole("heading", { name: "Ana Cruz" })).toBeInTheDocument();
    expect(card.getByText("Client")).toBeInTheDocument();
    expect(card.getByText("Recurring")).toBeInTheDocument();
  });

  it("gives a client three numbers: visits, when they joined, when they were last active", () => {
    render(<DirectoryProfileCard user={ana} profile={profile} />);
    expect(stat("Visits")).toHaveTextContent("4");
    expect(stat("Joined")).toHaveTextContent("Jun 2026");
    expect(stat("Last active")).toHaveTextContent("2 days ago");
  });

  it("gives an admin when they joined, when they were last active, and their role", () => {
    render(<DirectoryProfileCard user={{ id: "user_max", firstName: "Max", lastName: "Owner", email: "max@x.test", phoneNumber: "", role: "admin" }} profile={profile} />);
    expect(stat("Joined")).toHaveTextContent("Jun 2026");
    expect(stat("Last active")).toHaveTextContent("2 days ago");
    expect(stat("Role")).toHaveTextContent("Admin");
  });

  it("lists how to reach them, without social media links", () => {
    render(<DirectoryProfileCard user={ana} profile={profile} />);
    const contact = within(screen.getByRole("list", { name: "Contact" }));
    expect(contact.getByRole("link", { name: "ana@x.test" })).toHaveAttribute("href", "mailto:ana@x.test");
    expect(contact.getByRole("link", { name: "0917 123 4567" })).toHaveAttribute("href", "tel:0917 123 4567");
    expect(contact.getByRole("link", { name: "0918 555 0000" })).toHaveAttribute("href", "tel:0918 555 0000");
    expect(screen.queryByText("@anacruz")).toBeNull();
    expect(screen.queryByText("ana.cruz")).toBeNull();
    expect(screen.getByText("Prefers Instagram")).toBeInTheDocument();
    expect(screen.getByText("Last visit: Oct 5, 2026")).toBeInTheDocument();
  });

  it("shows initials in the square frame without a photo, and dashes for what it doesn't know", () => {
    render(<DirectoryProfileCard user={{ id: "m1", firstName: "Bea", lastName: "Lim", email: "", phoneNumber: "", role: "customer" }} />);
    const card = within(screen.getByRole("region", { name: "Bea Lim" }));
    expect(card.queryByRole("img")).toBeNull();
    expect(card.getByText("BL")).toHaveClass("aspect-square", "rounded-full");
    expect(stat("Visits")).toHaveTextContent("–");
    expect(stat("Joined")).toHaveTextContent("–");
    expect(card.getByText("No contact details yet.")).toBeInTheDocument();
  });

  it("offers the client page and the Notes, Edit and Delete actions", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onNotes = vi.fn();
    render(<DirectoryProfileCard user={ana} profile={profile} clientHref="/clients/7" onEdit={onEdit} onDelete={onDelete} onNotes={onNotes} />);
    expect(screen.getByRole("link", { name: "View client page" })).toHaveAttribute("href", "/clients/7");
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onNotes).toHaveBeenCalledWith(ana);
    expect(onEdit).toHaveBeenCalledWith(ana);
    expect(onDelete).toHaveBeenCalledWith(ana);
  });

  it("fills the height it is given on desktop: the card stretches and the banner grows into the room left", () => {
    render(<DirectoryProfileCard user={ana} profile={profile} />);
    const card = screen.getByRole("region", { name: "Ana Cruz" });
    expect(card).toHaveClass("lg:h-full");
    // the banner takes the room left, the round photo keeps its size
    expect(screen.getByTestId("banner")).toHaveClass("h-24", "lg:min-h-20", "lg:flex-1");
    expect(screen.getByRole("img", { name: "Ana Cruz" })).toHaveClass("w-24");
  });
});


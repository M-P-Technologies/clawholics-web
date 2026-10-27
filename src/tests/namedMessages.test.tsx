import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FAQDropdown from "@/components/features/admin/cms/FAQDropdown";
import TACDropdown from "@/components/features/admin/cms/TACDropdown";
import NailServiceDropdown from "@/components/features/admin/catalog/NailServiceDropdown";
import type { NailService } from "@/services/serviceService";

// What the admin's delete questions and toasts call the thing they're about: its name, not "this"/"it"
const show = vi.fn();
const deleteFaq = vi.fn();
const deleteTac = vi.fn();
const deleteService = vi.fn();

vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@/services/faqService", async (orig) => ({ ...(await orig<object>()), deleteFaq: (...a: unknown[]) => deleteFaq(...a) }));
vi.mock("@/services/tacService", async (orig) => ({ ...(await orig<object>()), deleteTac: (...a: unknown[]) => deleteTac(...a) }));
vi.mock("@/services/serviceService", async (orig) => ({
  ...(await orig<object>()),
  deleteService: (...a: unknown[]) => deleteService(...a),
  fetchServiceGallery: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => vi.clearAllMocks());

const openThenDelete = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  return await screen.findByRole("alertdialog");
};

describe("delete questions and toasts name the item", () => {
  it("FAQ: the question, quoted", async () => {
    deleteFaq.mockResolvedValue(undefined);
    render(<FAQDropdown faq={{ id: 7, question: "Do you take walk-ins?", answer: "Yes", display_order: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Do you take walk-ins?" }));
    const dialog = await openThenDelete();
    expect(within(dialog).getByText("“Do you take walk-ins?”")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete FAQ" }));
    await waitFor(() => expect(show).toHaveBeenCalledWith("success", "FAQ deleted", expect.stringContaining("“Do you take walk-ins?”")));
  });

  it("FAQ: says which one could not be deleted", async () => {
    deleteFaq.mockRejectedValue(new Error("x"));
    render(<FAQDropdown faq={{ id: 7, question: "Do you take walk-ins?", answer: "Yes", display_order: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Do you take walk-ins?" }));
    const dialog = await openThenDelete();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete FAQ" }));
    await waitFor(() => expect(show).toHaveBeenCalledWith("error", "FAQ not deleted", expect.stringContaining("“Do you take walk-ins?”")));
  });

  it("Terms section: the section's title, quoted", async () => {
    deleteTac.mockResolvedValue(undefined);
    render(<TACDropdown tac={{ id: 3, section: "LATE FEES", content: "Non-refundable", display_order: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "LATE FEES" }));
    const dialog = await openThenDelete();
    expect(within(dialog).getByText("“LATE FEES”")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete section" }));
    await waitFor(() => expect(show).toHaveBeenCalledWith("success", "Section deleted", expect.stringContaining("“LATE FEES”")));
  });

  it("Service: its name in the question and the toast", async () => {
    deleteService.mockResolvedValue(undefined);
    const service = { id: 4, name: "Gel Manicure", description: "Gel.", duration: "1 hr", image: "", category_id: 1, master_price: 450, junior_price: 400, pricing_type: "tiered", variants: [] } as unknown as NailService;
    render(<NailServiceDropdown service={service} categories={[{ id: 1, name: "Manicure", display_order: 1, addons: [] }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Gel Manicure" }));
    const dialog = await openThenDelete();
    expect(within(dialog).getByText("Gel Manicure")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete service" }));
    await waitFor(() => expect(show).toHaveBeenCalledWith("success", "Gel Manicure deleted", expect.stringContaining("Gel Manicure")));
  });
});

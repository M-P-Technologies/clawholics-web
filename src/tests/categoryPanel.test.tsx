import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AS_CategoryPanel from "../components/admin/AS_CategoryPanel";
import * as catalog from "../services/catalogService";

vi.mock("../services/catalogService", async () => {
  const actual = await vi.importActual<typeof import("../services/catalogService")>("../services/catalogService");
  return {
    ...actual,
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    reorderCategories: vi.fn(),
    deleteCategory: vi.fn(),
    createAddon: vi.fn(),
    updateAddon: vi.fn(),
    deleteAddon: vi.fn(),
  };
});

const categories = [
  { id: 1, name: "Manicure", display_order: 1, addons: [{ id: 10, category_id: 1, name: "Length: Long", price: 200, display_order: 1 }] },
  { id: 2, name: "Pedicure", display_order: 2, addons: [] },
];

const setup = () => {
  const onChanged = vi.fn();
  render(
    <AS_CategoryPanel categories={categories} tokenFetcher={async () => "tok"} clerkId="admin_1" onChanged={onChanged} />,
  );
  return { onChanged, user: userEvent.setup() };
};

describe("AS_CategoryPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists categories in order with their add-ons", () => {
    setup();
    expect(screen.getByText("Manicure")).toBeInTheDocument();
    expect(screen.getByText("Pedicure")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Length: Long")).toBeInTheDocument();
  });

  it("adds a category and refreshes", async () => {
    const { user, onChanged } = setup();
    vi.mocked(catalog.createCategory).mockResolvedValue({ id: 3, name: "Lashes", display_order: 3, addons: [] });

    await user.type(screen.getByLabelText(/new category name/i), "Lashes");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => expect(catalog.createCategory).toHaveBeenCalledWith("Lashes", { token: "tok", clerkId: "admin_1" }));
    expect(onChanged).toHaveBeenCalled();
  });

  it("moves a category down by sending the new order", async () => {
    const { user } = setup();
    vi.mocked(catalog.reorderCategories).mockResolvedValue([]);

    await user.click(screen.getByRole("button", { name: /move manicure down/i }));

    await waitFor(() => expect(catalog.reorderCategories).toHaveBeenCalledWith([2, 1], { token: "tok", clerkId: "admin_1" }));
  });

  it("needs two clicks to delete and shows the server's 409 message", async () => {
    const { user } = setup();
    vi.mocked(catalog.deleteCategory).mockRejectedValue(
      new catalog.ApiError("Move or delete the 3 services in this category first.", 409),
    );

    await user.click(screen.getByRole("button", { name: /^delete manicure$/i }));
    expect(catalog.deleteCategory).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /confirm delete manicure/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Move or delete the 3 services in this category first.");
  });

  it("adds an add-on to a category", async () => {
    const { user } = setup();
    vi.mocked(catalog.createAddon).mockResolvedValue({ id: 11, category_id: 2, name: "Removal", price: 150, display_order: 1 });

    await user.type(screen.getByLabelText(/new add-on name for pedicure/i), "Removal");
    await user.type(screen.getByLabelText(/new add-on price for pedicure/i), "150");
    await user.click(screen.getByRole("button", { name: /add add-on to pedicure/i }));

    await waitFor(() => expect(catalog.createAddon).toHaveBeenCalledWith(2, "Removal", 150, { token: "tok", clerkId: "admin_1" }));
  });

  it("keeps the typed category name and shows the error when add fails", async () => {
    const { user, onChanged } = setup();
    vi.mocked(catalog.createCategory).mockRejectedValue(new catalog.ApiError("Name already exists.", 409));

    await user.type(screen.getByLabelText(/new category name/i), "Manicure");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name already exists.");
    expect(screen.getByLabelText(/new category name/i)).toHaveValue("Manicure");
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("renames a category", async () => {
    const { user } = setup();
    vi.mocked(catalog.renameCategory).mockResolvedValue({ id: 2, name: "Feet", display_order: 2, addons: [] });

    await user.click(screen.getByRole("button", { name: /rename category pedicure/i }));
    const input = screen.getByLabelText(/^rename pedicure$/i);
    await user.clear(input);
    await user.type(input, "Feet");
    await user.click(within(input.parentElement as HTMLElement).getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(catalog.renameCategory).toHaveBeenCalledWith(2, "Feet", { token: "tok", clerkId: "admin_1" }));
    await waitFor(() => expect(screen.queryByLabelText(/^rename pedicure$/i)).not.toBeInTheDocument());
  });

  it("keeps the rename editor open when rename fails", async () => {
    const { user } = setup();
    vi.mocked(catalog.renameCategory).mockRejectedValue(new catalog.ApiError("Name already exists.", 409));

    await user.click(screen.getByRole("button", { name: /rename category pedicure/i }));
    const input = screen.getByLabelText(/^rename pedicure$/i);
    await user.clear(input);
    await user.type(input, "Manicure");
    await user.click(within(input.parentElement as HTMLElement).getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name already exists.");
    expect(screen.getByLabelText(/^rename pedicure$/i)).toHaveValue("Manicure");
  });

  it("ignores a second click on Add add-on while the first is pending", async () => {
    const { user } = setup();
    let resolve!: (v: catalog.ServiceAddon) => void;
    vi.mocked(catalog.createAddon).mockReturnValue(new Promise((res) => { resolve = res; }));

    await user.type(screen.getByLabelText(/new add-on name for pedicure/i), "Removal");
    await user.type(screen.getByLabelText(/new add-on price for pedicure/i), "150");
    const add = screen.getByRole("button", { name: /add add-on to pedicure/i });
    await user.click(add);
    await user.click(add);

    expect(catalog.createAddon).toHaveBeenCalledTimes(1);
    resolve({ id: 11, category_id: 2, name: "Removal", price: 150, display_order: 1 });
    await waitFor(() => expect(screen.getByLabelText(/new add-on name for pedicure/i)).toHaveValue(""));
  });

  it("removes an add-on", async () => {
    const { user, onChanged } = setup();
    vi.mocked(catalog.deleteAddon).mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: /remove add-on length: long/i }));

    await waitFor(() => expect(catalog.deleteAddon).toHaveBeenCalledWith(10, { token: "tok", clerkId: "admin_1" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});

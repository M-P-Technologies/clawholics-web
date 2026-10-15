import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ServicePricingFields, {
  draftFromService,
  payloadFromDraft,
  validateDraft,
  type PricingDraft,
} from "../features/cms/components/ServicePricingFields";

const categories = [
  { id: 1, name: "Manicure", display_order: 1, addons: [] },
  { id: 2, name: "Lashes", display_order: 2, addons: [] },
];

const tiered: PricingDraft = {
  categoryId: 1, pricingType: "tiered", masterPrice: "", juniorPrice: "250", flatPrice: "", variants: [],
};

describe("draft helpers", () => {
  it("turns a tiered draft with an empty master tier into a payload with 0 for not offered", () => {
    expect(payloadFromDraft(tiered)).toEqual({
      pricing_type: "tiered", master_price: 0, junior_price: 250, price: 0, variants: [],
    });
  });

  it("turns a flat draft with variants into a payload", () => {
    const draft: PricingDraft = {
      categoryId: 2, pricingType: "flat", masterPrice: "", juniorPrice: "", flatPrice: "",
      variants: [{ name: "Volume", price: "550" }, { name: "Mega Volume", price: "650" }],
    };
    expect(payloadFromDraft(draft)).toEqual({
      pricing_type: "flat", master_price: 0, junior_price: 0, price: 0,
      variants: [{ name: "Volume", price: 550 }, { name: "Mega Volume", price: 650 }],
    });
  });

  it("gives a flat draft with only a flat price a price and no variants", () => {
    const draft: PricingDraft = { ...tiered, pricingType: "flat", masterPrice: "", juniorPrice: "", flatPrice: "650" };
    expect(payloadFromDraft(draft)).toEqual({
      pricing_type: "flat", master_price: 0, junior_price: 0, price: 650, variants: [],
    });
  });

  it("drops stale tier values when switching to flat", () => {
    const draft: PricingDraft = { ...tiered, pricingType: "flat", masterPrice: "800", juniorPrice: "650", flatPrice: "" };
    const payload = payloadFromDraft(draft);
    expect(payload.master_price).toBe(0);
    expect(payload.junior_price).toBe(0);
  });

  it("drops a stale flat price when switching to tiered", () => {
    expect(payloadFromDraft({ ...tiered, flatPrice: "650" }).price).toBe(0);
  });

  it("validates a draft", () => {
    expect(validateDraft({ ...tiered, categoryId: null })).toMatch(/category/i);
    expect(validateDraft({ ...tiered, juniorPrice: "" })).toMatch(/at least one/i);
    expect(validateDraft({ ...tiered, pricingType: "flat", flatPrice: "" })).toMatch(/price or at least one option/i);
    expect(validateDraft({ ...tiered, pricingType: "flat", flatPrice: "", variants: [{ name: "", price: "100" }] })).toMatch(/option/i);
    expect(validateDraft(tiered)).toBeNull();
  });

  it("builds a draft from an existing service", () => {
    const draft = draftFromService({
      id: 1, name: "n", category: "Manicure", category_id: 1, description: "d", pricing_type: "tiered",
      master_price: 0, junior_price: 250, price: 0, duration: "1 hr", image: "x", variants: [],
    });
    expect(draft).toMatchObject({ categoryId: 1, pricingType: "tiered", masterPrice: "", juniorPrice: "250" });
  });
});

describe("ServicePricingFields", () => {
  it("shows tier inputs for tiered services and a single price for flat ones", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ServicePricingFields draft={tiered} onChange={onChange} isEditing categories={categories} />);
    expect(screen.getByLabelText(/master technician price/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^price$/i)).not.toBeInTheDocument();

    rerender(<ServicePricingFields draft={{ ...tiered, pricingType: "flat" }} onChange={onChange} isEditing categories={categories} />);
    expect(screen.getByLabelText(/^price$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/master technician price/i)).not.toBeInTheDocument();
  });

  it("reports a pricing type change", async () => {
    const onChange = vi.fn();
    render(<ServicePricingFields draft={tiered} onChange={onChange} isEditing categories={categories} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /pricing type/i }));
    await user.click(screen.getByRole("option", { name: /one price for everyone/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pricingType: "flat" }));
  });

  it("lists categories from the table, not a fixed list", async () => {
    render(<ServicePricingFields draft={tiered} onChange={vi.fn()} isEditing categories={categories} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /^category$/i }));
    expect(screen.getByRole("option", { name: "Lashes" })).toBeInTheDocument();
  });

  it("disables the inputs when not editing", () => {
    render(<ServicePricingFields draft={tiered} onChange={vi.fn()} isEditing={false} categories={categories} />);
    expect(screen.getByLabelText(/pricing type/i)).toBeDisabled();
  });
});

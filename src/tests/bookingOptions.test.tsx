import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BookingOptions from "@/components/features/client/booking/BookingOptions";

const variants = [
  { id: 1, name: "Cat Eye - Volume", price: 550 },
  { id: 2, name: "Cat Eye - Mega Volume", price: 650 },
];
const addons = [
  { id: 10, name: "Removal (our work)", price: 150 },
  { id: 11, name: "Length: Long", price: 200 },
];

describe("BookingOptions", () => {
  it("renders nothing when there are no variants and no add-ons", () => {
    const { container } = render(
      <BookingOptions variants={[]} addons={[]} variantId={null} addonIds={[]} onVariantChange={vi.fn()} onAddonsChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lets the client pick one option and shows its price", async () => {
    const onVariantChange = vi.fn();
    render(
      <BookingOptions variants={variants} addons={[]} variantId={null} addonIds={[]} onVariantChange={onVariantChange} onAddonsChange={vi.fn()} />,
    );
    expect(screen.getByText(/₱550/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("radio", { name: /mega volume/i }));
    expect(onVariantChange).toHaveBeenCalledWith(2);
  });

  it("toggles add-ons and reports the new list", async () => {
    const onAddonsChange = vi.fn();
    render(
      <BookingOptions variants={[]} addons={addons} variantId={null} addonIds={[10]} onVariantChange={vi.fn()} onAddonsChange={onAddonsChange} />,
    );
    expect(screen.getByRole("checkbox", { name: /removal/i })).toBeChecked();

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /length: long/i }));
    expect(onAddonsChange).toHaveBeenCalledWith([10, 11]);

    await user.click(screen.getByRole("checkbox", { name: /removal/i }));
    expect(onAddonsChange).toHaveBeenCalledWith([]);
  });
});

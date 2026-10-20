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
      <BookingOptions variants={[]} addons={[]} variantIds={[]} addonIds={[]} onVariantsChange={vi.fn()} onAddonsChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lets the client add any of the options, or none, each priced on top", async () => {
    const onVariantsChange = vi.fn();
    render(
      <BookingOptions variants={variants} addons={[]} variantIds={[1]} addonIds={[]} onVariantsChange={onVariantsChange} onAddonsChange={vi.fn()} />,
    );
    expect(screen.getByText("+₱550")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /cat eye - volume/i })).toBeChecked();

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /mega volume/i }));
    expect(onVariantsChange).toHaveBeenCalledWith([1, 2]);
    await user.click(screen.getByRole("checkbox", { name: /cat eye - volume/i }));
    expect(onVariantsChange).toHaveBeenCalledWith([]);
  });

  it("toggles add-ons and reports the new list", async () => {
    const onAddonsChange = vi.fn();
    render(
      <BookingOptions variants={[]} addons={addons} variantIds={[]} addonIds={[10]} onVariantsChange={vi.fn()} onAddonsChange={onAddonsChange} />,
    );
    expect(screen.getByRole("checkbox", { name: /removal/i })).toBeChecked();

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /length: long/i }));
    expect(onAddonsChange).toHaveBeenCalledWith([10, 11]);

    await user.click(screen.getByRole("checkbox", { name: /removal/i }));
    expect(onAddonsChange).toHaveBeenCalledWith([]);
  });
});

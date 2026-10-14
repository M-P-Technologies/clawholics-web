import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FAQDropdown from "@/components/admin/FAQDropdown";
import TACDropdown from "@/components/admin/TACDropdown";
import type { SortableHandleProps } from "@/components/molecules";

vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));

const handle = { listeners: {}, attributes: { role: "button", tabIndex: 0 }, setActivatorNodeRef: () => {} } as unknown as SortableHandleProps;

// A button inside a button is invalid HTML and breaks hydration
const nestedButtons = (container: HTMLElement) => container.querySelectorAll("button button, button [role=button]").length;

describe("content editor item headers", () => {
  it("keeps the FAQ drag handle beside its toggle, not inside it", () => {
    const { container } = render(<FAQDropdown faq={{ id: 7, question: "Do you take walk-ins?", answer: "Yes", display_order: 1 }} dragHandleProps={handle} />);
    expect(nestedButtons(container)).toBe(0);
    expect(screen.getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Do you take walk-ins?" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the terms drag handle beside its toggle, not inside it", () => {
    const { container } = render(<TACDropdown tac={{ id: 3, section: "Deposits", content: "Non-refundable", display_order: 1 }} dragHandleProps={handle} />);
    expect(nestedButtons(container)).toBe(0);
    expect(screen.getByRole("button", { name: "Deposits" })).toHaveAttribute("aria-expanded", "false");
  });
});

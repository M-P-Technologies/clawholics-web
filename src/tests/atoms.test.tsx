import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";
import { Card, Checkbox, Divider, IconButton, Input, Radio, Textarea } from "@/components/atoms";

describe("Card", () => {
  it("is the admin's card, as the element asked for", () => {
    render(<Card as="section" aria-label="Box">Hi</Card>);
    const box = screen.getByRole("region", { name: "Box" });
    expect(box.className).toContain("bg-milk");
    expect(box.className).toContain("shadow-petal");
    expect(box.className).toContain("p-6");
  });
  it("has a tinted tone and no padding when asked", () => {
    const { container } = render(<Card tone="tint" padding="none">x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("bg-crimson-light/15");
    expect((container.firstChild as HTMLElement).className).not.toContain("p-6");
  });
});

describe("IconButton", () => {
  it("names itself and clicks", () => {
    const onClick = vi.fn();
    render(<IconButton label="Delete" icon={Trash2} onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("title", "Delete");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});

describe("form atoms", () => {
  it("pass native props through", () => {
    render(
      <>
        <Input aria-label="Name" defaultValue="Ana" />
        <Textarea aria-label="Note" rows={2} />
        <Checkbox aria-label="Agree" defaultChecked />
        <Radio aria-label="One" name="r" />
        <Divider />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ana");
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveAttribute("rows", "2");
    expect(screen.getByRole("checkbox", { name: "Agree" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "One" })).not.toBeChecked();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

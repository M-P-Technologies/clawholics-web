import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextField, SelectField } from "@/components/features/admin/cms/fields";

// Marks what the atoms render, so the test can tell the fields use them
vi.mock("@/components/atoms", async (orig) => {
  const real = await orig<typeof import("@/components/atoms")>();
  const { createElement } = await import("react");
  return {
    ...real,
    Input: (props: object) => createElement(real.Input as never, { "data-atom": "input", ...props }),
    Textarea: (props: object) => createElement(real.Textarea as never, { "data-atom": "textarea", ...props }),
  };
});
vi.mock("@/components/features/admin/cms/CmsEditor", () => ({ useCmsEditor: () => ({ showPage: () => {} }) }));

describe("CMS fields on the form atoms", () => {
  it("TextField renders the Input atom", () => {
    const onChange = vi.fn();
    render(<TextField label="Headline" value="Hi" onChange={onChange} />);
    const input = screen.getByLabelText("Headline") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-atom", "input");
    expect(input.value).toBe("Hi");
    expect(input.className).toContain("rounded-md border border-crimson-light");
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(onChange).toHaveBeenCalledWith("Hello");
  });

  it("TextField with rows renders the Textarea atom", () => {
    const onChange = vi.fn();
    render(<TextField label="Story" value="Once" rows={3} onChange={onChange} />);
    const area = screen.getByLabelText("Story") as HTMLTextAreaElement;
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveAttribute("data-atom", "textarea");
    expect(area.rows).toBe(3);
    expect(area.className).toContain("rounded-md border border-crimson-light");
    fireEvent.change(area, { target: { value: "Twice" } });
    expect(onChange).toHaveBeenCalledWith("Twice");
  });

  it("SelectField is reachable by its label and reports the choice", () => {
    const onChange = vi.fn();
    render(<SelectField label="Opens" value="/" options={[{ value: "/", label: "Home" }, { value: "/faq", label: "FAQ" }]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Opens"));
    fireEvent.click(screen.getByRole("option", { name: /FAQ/ }));
    expect(onChange).toHaveBeenCalledWith("/faq");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OffersEditor from "@/components/features/admin/cms/OffersEditor";

const services = [{ id: 4, name: "Gel manicure" }] as never;
const offer = { title: "20% off", line: "On gel", note: "", image: "", buttonLabel: "Book now", link: "/my/explore" };

describe("OffersEditor", () => {
  it("adds an offer with sensible defaults", () => {
    const onChange = vi.fn();
    render(<OffersEditor offers={[]} services={services} onChange={onChange} upload={vi.fn()} uploading={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Add an offer" }));
    expect(onChange).toHaveBeenCalledWith([{ title: "", line: "", note: "", image: "", buttonLabel: "Book now", link: "/my/explore" }]);
  });

  it("edits and removes an offer", () => {
    const onChange = vi.fn();
    render(<OffersEditor offers={[offer]} services={services} onChange={onChange} upload={vi.fn()} uploading={{}} />);
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "30% off" } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...offer, title: "30% off" }]);
    fireEvent.change(screen.getByLabelText("Button opens"), { target: { value: "/my/explore/4" } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...offer, link: "/my/explore/4" }]);
    fireEvent.click(screen.getByRole("button", { name: "Remove offer 1" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("stops at the maximum", () => {
    render(<OffersEditor offers={Array(6).fill(offer)} services={services} onChange={vi.fn()} upload={vi.fn()} uploading={{}} />);
    expect(screen.getByRole("button", { name: "Add an offer" })).toBeDisabled();
  });
});

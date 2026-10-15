import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DetailsCard from "@/features/profile/components/DetailsCard";
import EditDetailsSheet from "@/features/profile/components/EditDetailsSheet";

describe("DetailsCard", () => {
  it("lists the details read-only, shows a dash for empty ones, and offers Edit", () => {
    const onEdit = vi.fn();
    render(<DetailsCard rows={[{ label: "Email", value: "a@b.co" }, { label: "Phone", value: "" }]} onEdit={onEdit} />);
    expect(screen.getByText("a@b.co")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe("EditDetailsSheet", () => {
  const base = () => ({
    open: true,
    error: null as string | null,
    fields: [{ id: "first_name", name: "first_name", label: "First Name:", type: "text" as const, value: "Ana", onChange: vi.fn() }],
    genderLabel: "Female",
    genderOptions: [{ value: "female", label: "Female" }, { value: "male", label: "Male" }],
    genderValue: "female",
    isGenderOpen: false,
    onToggleGender: vi.fn(),
    onSelectGender: vi.fn(),
    contactMethod: "",
    contactMethodOptions: [{ value: "", label: "No preference" }, { value: "sms", label: "Text message" }],
    onSelectContactMethod: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  });

  it("is closed by default and a form with Save and Cancel when open", () => {
    const { rerender } = render(<EditDetailsSheet {...base()} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const p = base();
    rerender(<EditDetailsSheet {...p} />);
    expect(screen.getByLabelText("First Name:")).toHaveValue("Ana");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(p.onSave).toHaveBeenCalled();
    expect(p.onCancel).toHaveBeenCalled();
  });

  it("shows a save error, and picks a gender from the list", () => {
    const p = { ...base(), error: "Couldn't save", isGenderOpen: true };
    render(<EditDetailsSheet {...p} />);
    expect(screen.getByText("Couldn't save")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Male"));
    expect(p.onSelectGender).toHaveBeenCalledWith("male");
  });
});

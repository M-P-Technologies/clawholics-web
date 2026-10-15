import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditActions } from "@/components/molecules";

const base = { isEditing: false, isSaving: false, onEdit: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };

describe("EditActions", () => {
  it("viewing: Edit calls onEdit and Delete calls onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<EditActions {...base} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("viewing without onDelete shows no Delete", () => {
    render(<EditActions {...base} />);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("editing: Save calls onSave and Cancel calls onCancel", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<EditActions {...base} isEditing onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("create mode says Add while editing and shows nothing otherwise", () => {
    const { rerender } = render(<EditActions {...base} isEditing isCreateMode />);
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    rerender(<EditActions {...base} isCreateMode />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddAdminModal from "@/components/admin/AddAdminModal";
import EditAdminModal from "@/components/admin/EditAdminModal";
import ImagePreviewModal from "@/components/admin/ImagePreviewModal";
import { Dialog } from "@/components/organisms";

const form = { firstName: "Ana", lastName: "Cruz", email: "ana@example.com" };

describe("AddAdminModal", () => {
  it("is a modal dialog with its heading and primary button, and Escape closes it", () => {
    const onClose = vi.fn();
    render(<AddAdminModal open onClose={onClose} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Add admin" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "CLAWHOLICS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MAKE ADMIN" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape while saving", () => {
    const onClose = vi.fn();
    render(<AddAdminModal open onClose={onClose} onSubmit={vi.fn()} isSaving />);
    expect(screen.getByRole("dialog", { name: "Add admin" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("EditAdminModal", () => {
  const setup = (saving = false) => {
    const onClose = vi.fn();
    render(<EditAdminModal open form={form} saving={saving} onChange={vi.fn()} onClose={onClose} onSave={vi.fn()} />);
    return onClose;
  };

  it("is a modal dialog with its heading and Save Changes button, and Escape closes it", () => {
    const onClose = setup();
    expect(screen.getByRole("dialog", { name: "Edit admin" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "EDIT ADMIN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape while saving", () => {
    const onClose = setup(true);
    expect(screen.getByRole("dialog", { name: "Edit admin" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ImagePreviewModal", () => {
  it("is a modal dialog named by its title, with the image, and Escape closes it", () => {
    const onClose = vi.fn();
    render(<ImagePreviewModal imageUrl="https://img/1.webp" title="Review photo" onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Review photo" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("img", { name: "Preview" })).toHaveAttribute("src", "https://img/1.webp");
    expect(screen.getByRole("button", { name: "Close image preview" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without an image", () => {
    render(<ImagePreviewModal imageUrl={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("over another dialog, Escape closes only the preview", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog open onClose={outer} title="Outer"><p>outer body</p></Dialog>
        <ImagePreviewModal imageUrl="https://img/1.webp" onClose={inner} />
      </>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});

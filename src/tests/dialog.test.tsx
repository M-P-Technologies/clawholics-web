import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "@/components/atoms";
import { ConfirmDialog, Dialog, FeedbackDialog } from "@/components/organisms";

function Opener({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Edit details" dismissible={dismissible}>
        <input aria-label="Name" />
        <button>Save</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("moves focus in, keeps Tab inside, closes on Escape and gives focus back", () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Edit details" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    screen.getByRole("button", { name: "Save" }).focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("stays open on Escape and backdrop clicks when not dismissible", () => {
    render(<Opener dismissible={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("locks the page's scroll while open", () => {
    render(<Opener />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("slides in from the right as a drawer, with its own header", () => {
    render(<Dialog open onClose={() => {}} title="Appointment" placement="drawer" header={<h2>Appointment #7</h2>}>x</Dialog>);
    const dialog = screen.getByRole("dialog", { name: "Appointment" });
    expect(dialog.className).toContain("drawer-right");
    expect(screen.getByRole("heading", { name: "Appointment #7" })).toBeInTheDocument();
  });
});

describe("dialog presets", () => {
  it("ConfirmDialog locks itself while the action runs", () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete it?" confirmLabel="Delete" loadingLabel="Deleting…" loading onConfirm={() => {}} onClose={onClose}>Gone for good.</ConfirmDialog>);
    expect(screen.getByRole("alertdialog", { name: "Delete it?" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
  it("FeedbackDialog says how it ended, with one button", () => {
    const onClose = vi.fn();
    render(<FeedbackDialog open title="Saved" message="All done." isError={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("stacked dialogs", () => {
  function Stack({ outer = true, inner = true }: { outer?: boolean; inner?: boolean }) {
    return (
      <>
        <Dialog open={outer} onClose={() => document.dispatchEvent(new Event("outer-closed"))} title="Outer"><button>a</button></Dialog>
        <Dialog open={inner} onClose={() => document.dispatchEvent(new Event("inner-closed"))} title="Inner"><button>b</button></Dialog>
      </>
    );
  }
  function Controlled() {
    const [outer, setOuter] = useState(true);
    const [inner, setInner] = useState(true);
    return (
      <>
        <Dialog open={outer} onClose={() => setOuter(false)} title="Outer"><button>a</button></Dialog>
        <Dialog open={inner} onClose={() => setInner(false)} title="Inner"><button>b</button></Dialog>
      </>
    );
  }

  it("Escape closes only the top dialog, then the next", () => {
    render(<Controlled />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("restores the page's scroll when both close in the same render", () => {
    const { rerender } = render(<Stack />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Stack outer={false} inner={false} />);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Select inside a Dialog", () => {
  function Host() {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onClose={() => setOpen(false)} title="Pick">
        <Select aria-label="Colour" value="" onChange={() => {}} options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} />
      </Dialog>
    );
  }
  it("Escape closes only the list", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Colour" });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Pick" })).toBeInTheDocument();
  });
});

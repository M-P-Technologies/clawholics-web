import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropArea } from "@/components/features/admin/cms/fields";

const photo = (name: string) => new File(["x"], name, { type: "image/png" });
const input = <input id="pick" type="file" className="sr-only" />;
const drop = (area: HTMLElement, files: File[]) => fireEvent.drop(area, { dataTransfer: { files } });

describe("DropArea", () => {
  it("shows the label and the default hint, or its own", () => {
    const { rerender } = render(<DropArea id="pick" uploading={false} label="Add a photo" onFile={vi.fn()} input={input} />);
    expect(screen.getByText("Add a photo")).toBeInTheDocument();
    expect(screen.getByText("PNG, JPG or WebP. Click, or drop it here.")).toBeInTheDocument();
    rerender(<DropArea id="pick" uploading={false} label="Add photos" hint="Drop them here." onFiles={vi.fn()} input={input} />);
    expect(screen.getByText("Drop them here.")).toBeInTheDocument();
  });

  it("hands one dropped photo to onFile", () => {
    const onFile = vi.fn();
    render(<DropArea id="pick" uploading={false} onFile={onFile} input={input} />);
    const first = photo("a.png");
    drop(screen.getByText("Upload a photo").closest("label")!, [first, photo("b.png")]);
    expect(onFile).toHaveBeenCalledWith(first);
  });

  it("hands every dropped photo to onFiles when it takes several", () => {
    const onFiles = vi.fn();
    render(<DropArea id="pick" uploading={false} label="Add photos" onFiles={onFiles} input={input} />);
    const files = [photo("a.png"), photo("b.png")];
    drop(screen.getByText("Add photos").closest("label")!, files);
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(Array.from(onFiles.mock.calls[0][0])).toEqual(files);
  });

  it("takes nothing while it is uploading", () => {
    const onFile = vi.fn();
    const onFiles = vi.fn();
    render(<DropArea id="pick" uploading onFile={onFile} onFiles={onFiles} input={input} />);
    drop(screen.getByText("Uploading…").closest("label")!, [photo("a.png")]);
    expect(onFile).not.toHaveBeenCalled();
    expect(onFiles).not.toHaveBeenCalled();
  });
});

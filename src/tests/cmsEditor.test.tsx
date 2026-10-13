import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CmsEditor from "@/components/admin/cms/CmsEditor";
import { PanelSection, SaveBar, TextField } from "@/components/admin/cms/fields";

vi.mock("@/components/admin/SideBar", () => ({ default: () => <div /> }));

const PAGES = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/services" },
];

function Editor({ onSave = vi.fn(), dirty = false }: { onSave?: () => void; dirty?: boolean }) {
  return (
    <CmsEditor title="Homepage" pages={PAGES} header={<SaveBar dirty={dirty} saving={false} onSave={onSave} onDiscard={vi.fn()} />}>
      <PanelSection title="Hero" page="/">
        <TextField label="Headline" value="Hello" onChange={vi.fn()} />
      </PanelSection>
      <PanelSection title="Services page" page="/services">
        <TextField label="Subtitle" value="Our menu" onChange={vi.fn()} />
      </PanelSection>
    </CmsEditor>
  );
}

const frame = () => screen.getByTitle(/^Preview of/) as HTMLIFrameElement;

describe("CmsEditor", () => {
  it("puts the controls in a side panel and the real page in a named preview frame", () => {
    render(<Editor />);
    const panel = within(screen.getByRole("complementary", { name: "Homepage settings" }));
    expect(panel.getByRole("textbox", { name: "Headline" })).toHaveValue("Hello");
    expect(frame()).toHaveAttribute("src", "/");
    expect(frame()).toHaveAttribute("name", "clawholics-cms-preview");
    expect(screen.getByRole("link", { name: "Open the live page in a new tab" })).toHaveAttribute("href", "/");
  });

  it("switches between a desktop and a phone frame", () => {
    render(<Editor />);
    const device = within(screen.getByRole("group", { name: "Device" }));
    expect(device.getByRole("button", { name: "Desktop" })).toHaveAttribute("aria-pressed", "true");
    expect(frame().parentElement).toHaveAttribute("data-device", "desktop");
    fireEvent.click(device.getByRole("button", { name: "Mobile" }));
    expect(device.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");
    expect(frame().parentElement).toHaveAttribute("data-device", "mobile");
    // The page is clipped to the phone's rounded screen, so nothing shows past the corners
    expect(frame().style.clipPath).toBe("inset(0 round 26px)");
    fireEvent.click(device.getByRole("button", { name: "Desktop" }));
    expect(frame().style.clipPath).toBe("");
  });

  it("shows the page a section changes when you work in it", () => {
    render(<Editor />);
    fireEvent.focus(screen.getByRole("textbox", { name: "Subtitle" }));
    expect(frame()).toHaveAttribute("src", "/services");
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "Headline" }));
    expect(frame()).toHaveAttribute("src", "/");
  });

  it("has Edit and Preview tabs for phones", () => {
    render(<Editor />);
    const tabs = within(screen.getByRole("tablist", { name: "Editor view" }));
    expect(tabs.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(tabs.getByRole("tab", { name: "Preview" }));
    expect(tabs.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Preview" }).className).toMatch(/(^|\s)flex(\s|$)/);
  });

  it("only offers Save when there are unsaved changes", () => {
    const { rerender } = render(<Editor />);
    expect(screen.getByText("Live on the site")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    const onSave = vi.fn();
    rerender(<Editor dirty onSave={onSave} />);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });
});

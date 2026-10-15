import { afterEach, describe, expect, it, vi } from "vitest";

// The bridge reads the frame's name and parent when it loads, so each test imports a fresh copy
const fresh = () => import("@/features/cms/lib/cmsPreview");

const realParent = window.parent;
afterEach(() => {
  window.name = "";
  Object.defineProperty(window, "parent", { value: realParent, configurable: true });
  vi.resetModules();
});

// Inside the editor's frame: the frame's name, and a parent window that isn't this one
function inFrame() {
  const posted: unknown[] = [];
  const parent = { postMessage: (message: unknown) => posted.push(message) };
  window.name = "clawholics-cms-preview";
  Object.defineProperty(window, "parent", { value: parent, configurable: true });
  return { parent, posted };
}

const fromEditor = (parent: unknown, data: unknown) =>
  window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin, source: parent as MessageEventSource }));

describe("cms preview bridge", () => {
  it("is a plain fetch outside the editor's frame", async () => {
    const { previewed, inCmsPreview } = await fresh();
    const load = vi.fn(async () => ({ home_title: "Saved" }));
    expect(inCmsPreview()).toBe(false);
    expect(await previewed("home", load, "home")).toEqual({ home_title: "Saved" });
    expect(await previewed("home", load, "home")).toEqual({ home_title: "Saved" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("in the frame, says it's ready and lays the editor's drafts over the saved content", async () => {
    const { parent, posted } = inFrame();
    const { previewed } = await fresh();
    expect(posted).toEqual([{ type: "cms-preview:ready" }]);

    fromEditor(parent, { type: "cms-preview:draft", drafts: { home: { home_title: "Draft" }, carousel: [{ id: 1, image_url: "a.jpg", position: 1 }] } });
    const load = vi.fn(async () => ({ home_title: "Saved", home_services_subtitle: "Kept" }));
    expect(await previewed("home", load, "home")).toEqual({ home_title: "Draft", home_services_subtitle: "Kept" });
    expect(await previewed("carousel", async () => [], "carousel")).toEqual([{ id: 1, image_url: "a.jpg", position: 1 }]);
  });

  it("fetches the saved content once, and again after the editor says it saved", async () => {
    const { parent } = inFrame();
    const { previewed } = await fresh();
    fromEditor(parent, { type: "cms-preview:draft", drafts: {} });
    const load = vi.fn(async () => [{ id: 1 }]);
    await previewed("faqs", load);
    await previewed("faqs", load);
    expect(load).toHaveBeenCalledTimes(1);
    fromEditor(parent, { type: "cms-preview:refresh" });
    await previewed("faqs", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores messages from anywhere but the editor", async () => {
    inFrame();
    const { previewed } = await fresh();
    fromEditor({ postMessage() {} }, { type: "cms-preview:draft", drafts: { home: { home_title: "Sneaky" } } });
    vi.useFakeTimers();
    const result = previewed("home", async () => ({ home_title: "Saved" }), "home");
    await vi.advanceTimersByTimeAsync(2000); // no drafts arrived, so it stops waiting
    vi.useRealTimers();
    expect(await result).toEqual({ home_title: "Saved" });
  });
});

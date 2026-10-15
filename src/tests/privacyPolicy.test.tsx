import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Privacy from "@/app/(site)/privacy/page";
import PrivacyPolicy from "@/app/(admin)/privacy-policy/page";
import robots from "@/app/robots";

const fetchLegalContent = vi.fn();
const updateLegalContent = vi.fn();
vi.mock("@/services/contentService", () => ({
  fetchLegalContent: () => fetchLegalContent(),
  updateLegalContent: (...a: unknown[]) => updateLegalContent(...a),
}));
vi.mock("@/data/privacyPolicyHtml", () => ({ PRIVACY_POLICY_HTML: "<h1>PRIVACY POLICY</h1><p>The original text.</p>" }));
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div /> }));
const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

beforeEach(() => {
  fetchLegalContent.mockReset().mockResolvedValue({});
  updateLegalContent.mockReset().mockResolvedValue({});
  show.mockReset();
});

describe("privacy policy page", () => {
  it("shows the original policy until one is saved", async () => {
    render(<Privacy />);
    expect(await screen.findByText("The original text.")).toBeInTheDocument();
  });

  it("shows the policy saved in the admin", async () => {
    fetchLegalContent.mockResolvedValue({ legal_privacy_html: "<h1>Our privacy policy</h1><p>We keep your details safe.</p>" });
    render(<Privacy />);
    expect(await screen.findByText("We keep your details safe.")).toBeInTheDocument();
    expect(screen.queryByText("The original text.")).toBeNull();
  });

  it("falls back to the original if the saved policy can't load", async () => {
    fetchLegalContent.mockRejectedValue(new Error("down"));
    render(<Privacy />);
    expect(await screen.findByText("The original text.")).toBeInTheDocument();
  });
});

describe("privacy policy editor", () => {
  it("starts from the original, and saves the edited policy, cleaned", async () => {
    render(<PrivacyPolicy />);
    const editor = await screen.findByRole("textbox", { name: "Privacy policy" });
    expect(editor).toHaveTextContent("The original text.");
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    editor.innerHTML = '<h1>PRIVACY POLICY</h1><p>Updated text.</p><img src="x" onerror="alert(1)">';
    fireEvent.input(editor);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateLegalContent).toHaveBeenCalled());
    const saved = updateLegalContent.mock.calls[0][0].legal_privacy_html as string;
    expect(saved).toContain("Updated text.");
    expect(saved).not.toContain("onerror");
    expect(show).toHaveBeenCalledWith("success", "Privacy policy saved", expect.any(String));
  });

  it("won't save an empty policy", async () => {
    render(<PrivacyPolicy />);
    const editor = await screen.findByRole("textbox", { name: "Privacy policy" });
    editor.innerHTML = "<p><br></p>";
    fireEvent.input(editor);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(show).toHaveBeenCalledWith("error", "The policy is empty", expect.any(String));
    expect(updateLegalContent).not.toHaveBeenCalled();
  });

  it("puts back the original", async () => {
    fetchLegalContent.mockResolvedValue({ legal_privacy_html: "<p>Edited before.</p>" });
    render(<PrivacyPolicy />);
    expect(await screen.findByRole("textbox", { name: "Privacy policy" })).toHaveTextContent("Edited before.");
    fireEvent.click(screen.getByRole("button", { name: "Put back the original" }));
    expect(screen.getByRole("textbox", { name: "Privacy policy" })).toHaveTextContent("The original text.");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("keeps the editor out of search engines, but not the public page", () => {
    const disallow = robots().rules as { disallow: string[] };
    expect(disallow.disallow).toContain("/privacy-policy");
    expect(disallow.disallow).not.toContain("/privacy");
  });
});

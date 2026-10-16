import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import type { MyAccount } from "@/hooks/client/useMyAccount";

let account: MyAccount;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => account }));

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const signedIn = (over: Record<string, unknown> = {}) =>
  ({
    dbUser: { first_name: "Ana", last_name: "Cruz", email: "ana@example.com" },
    clerkUser: { firstName: "Ana", imageUrl: "", hasImage: false },
    ...over,
  }) as unknown as MyAccount;

const renderWith = (a: MyAccount, ui: React.ReactElement) => {
  account = a;
  return render(ui);
};

beforeEach(() => navigate.mockReset());

describe("ClientScreen", () => {
  it("has the screen's title, a welcome, the site link and who is signed in", () => {
    renderWith(signedIn(), <ClientScreen title="My profile"><p>body</p></ClientScreen>);
    const bar = screen.getByRole("banner");
    expect(bar).toContainElement(screen.getByRole("heading", { level: 1, name: "My profile" }));
    expect(screen.getByText("Welcome back, Ana!").className).toContain("lg:block");
    const site = screen.getByRole("link", { name: /View site/ });
    expect(site).toHaveAttribute("href", "/");
    expect(site).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("img", { name: "Ana Cruz" })).toHaveLength(2);
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("shows the client's photo when they have one", () => {
    const { container } = renderWith(signedIn({ clerkUser: { firstName: "Ana", imageUrl: "https://img/ana.png", hasImage: true } }), <ClientScreen title="Home"><p /></ClientScreen>);
    expect(container.querySelector('img[src="https://img/ana.png"]')).not.toBeNull();
  });

  it("shows today's date once it is in the browser", () => {
    renderWith(signedIn(), <ClientScreen title="Home"><p /></ClientScreen>);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it("puts the screen's own controls in the bar", () => {
    renderWith(signedIn(), <ClientScreen title="Explore" actions={<button>Filter</button>}><p /></ClientScreen>);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("button", { name: "Filter" }));
  });

  it("shows a back link to the given path when there is one", () => {
    renderWith(signedIn(), <ClientScreen title="Book" back="/my/explore"><p /></ClientScreen>);
    // A round icon on phones and a text link on computers (CSS shows one); both go to the same place
    const backs = screen.getAllByRole("link", { name: /back/i });
    expect(backs).toHaveLength(2);
    for (const back of backs) expect(back).toHaveAttribute("href", "/my/explore");
  });

  it("goes back one step in history when asked to", () => {
    renderWith(signedIn(), <ClientScreen title="Payment" back="history"><p /></ClientScreen>);
    const backs = screen.getAllByRole("button", { name: /back/i });
    expect(backs).toHaveLength(2);
    for (const back of backs) fireEvent.click(back);
    expect(navigate.mock.calls).toEqual([[-1], [-1]]);
  });

  it("has no back link on a tab", () => {
    renderWith(signedIn(), <ClientScreen title="My profile"><p /></ClientScreen>);
    expect(screen.queryByRole("link", { name: /back/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });
});

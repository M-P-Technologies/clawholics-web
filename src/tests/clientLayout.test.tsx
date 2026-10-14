import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/server/auth";

vi.mock("@clerk/nextjs/server", () => ({ currentUser: vi.fn() }));
vi.mock("@/server/auth", () => ({ isAdmin: vi.fn() }));
vi.mock("@/server/worker", () => ({ nextApiEnabled: () => true }));

beforeEach(() => vi.mocked(redirect).mockClear());

describe("the client app's layout", () => {
  it("sends an admin whose role is only in the database to the dashboard", async () => {
    vi.mocked(currentUser).mockResolvedValue({ publicMetadata: {} } as never);
    vi.mocked(isAdmin).mockResolvedValue(true);
    const { default: ClientLayout } = await import("@/app/(client)/layout");
    await ClientLayout({ children: null });
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("lets a client in", async () => {
    vi.mocked(currentUser).mockResolvedValue({ publicMetadata: {} } as never);
    vi.mocked(isAdmin).mockResolvedValue(false);
    const { default: ClientLayout } = await import("@/app/(client)/layout");
    await ClientLayout({ children: null });
    expect(redirect).not.toHaveBeenCalled();
  });
});

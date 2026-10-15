import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isApiAdmin } from "@/server/auth";
import ClientLayout from "@/app/(client)/layout";

vi.mock("@clerk/nextjs/server", () => ({ currentUser: vi.fn() }));
vi.mock("@/server/auth", () => ({ isApiAdmin: vi.fn() }));

beforeEach(() => vi.mocked(redirect).mockClear());

describe("the client app's layout", () => {
  it("sends an admin whose role is only in the database to the dashboard", async () => {
    vi.mocked(currentUser).mockResolvedValue({ publicMetadata: {} } as never);
    vi.mocked(isApiAdmin).mockResolvedValue(true);
    await ClientLayout({ children: null });
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("lets a client in", async () => {
    vi.mocked(currentUser).mockResolvedValue({ publicMetadata: {} } as never);
    vi.mocked(isApiAdmin).mockResolvedValue(false);
    await ClientLayout({ children: null });
    expect(redirect).not.toHaveBeenCalled();
  });
});

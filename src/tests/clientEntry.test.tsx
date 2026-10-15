import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRedirectIfSignedIn } from "@/hooks/useRedirectIfSignedIn";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: "u1" } }) }));

function Probe() {
  useRedirectIfSignedIn();
  return null;
}

describe("signing in", () => {
  it("takes a signed-in visitor of the login page to the client app", () => {
    render(<Probe />);
    expect(navigate).toHaveBeenCalledWith("/my", { replace: true });
  });
});

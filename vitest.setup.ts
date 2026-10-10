import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Mock SVG components (Next loads them through @svgr/webpack, which Vitest doesn't run)
vi.mock("@/assets/bow.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "bow-icon" }),
}));

vi.mock("@/assets/logo/logo-primary.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "logo-icon" }),
}));

vi.mock("@/assets/cherry.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "cherry-icon" }),
}));

// Also handle relative imports if needed, though @ alias is preferred
vi.mock("../assets/bow.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "bow-icon" }),
}));

vi.mock("../assets/logo/logo-primary.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "logo-icon" }),
}));

vi.mock("../assets/cherry.svg", () => ({
  default: () => React.createElement("div", { "data-testid": "cherry-icon" }),
}));

// `server-only` throws outside a React Server environment; server modules are tested directly
vi.mock("server-only", () => ({}));

// Mock next/navigation (used by src/lib/router)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock @clerk/nextjs
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isSignedIn: false,
    user: null,
    isLoaded: true,
  }),
  useAuth: () => ({
    isSignedIn: false,
    userId: null,
    getToken: async () => "test-token",
    isLoaded: true,
  }),
  useClerk: () => ({
    openUserProfile: vi.fn(),
    signOut: vi.fn(),
  }),
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === "signed-out" ? children : null,
  UserButton: () => React.createElement("div", { "data-testid": "user-button" }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

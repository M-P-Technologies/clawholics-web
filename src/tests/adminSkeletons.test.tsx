import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  AdminDirectorySkeleton,
  ClientPageSkeleton,
  CmsEditorSkeleton,
  ReportSkeleton,
  ScannerSkeleton,
  ScheduleSkeleton,
} from "@/components/admin/skeletons";
import ReportPage from "@/components/admin/dashboard/ReportPage";

vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/hooks/admin/useReports", () => ({
  useDashboardReport: () => ({ range: "month", setRange: vi.fn(), data: null, loading: true, failed: false, retry: vi.fn() }),
}));

const screens: [string, ReactElement, string, string][] = [
  ["Dashboard", <ReportSkeleton key="r" title="Dashboard" />, "Dashboard", "Loading the dashboard"],
  ["Sales", <ReportSkeleton key="s" title="Sales" />, "Sales", "Loading sales"],
  ["a content editor", <CmsEditorSkeleton key="c" title="About Us" />, "About Us", "Loading About Us"],
  ["the Schedule", <ScheduleSkeleton key="sc" />, "Schedule", "Loading the schedule"],
  ["the Admin Directory", <AdminDirectorySkeleton key="a" />, "Admin Directory", "Loading admins"],
  ["the scanner", <ScannerSkeleton key="q" />, "Loyalty QR Scanner", "Loading the scanner"],
  ["a client's page", <ClientPageSkeleton key="cp" />, "Client", "Loading the client"],
];

describe("admin loading skeletons", () => {
  it.each(screens)("%s keeps the admin frame and announces one loading region", (_, ui, title, label) => {
    render(ui);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    // One region for screen readers, however many bars it holds
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", { name: label })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(5);
  });

  it("is what a report page shows the first time it loads", () => {
    render(<ReportPage title="Performance">{() => <p>numbers</p>}</ReportPage>);
    expect(screen.getByRole("status", { name: "Loading performance" })).toBeInTheDocument();
    expect(screen.queryByText("numbers")).toBeNull();
  });
});

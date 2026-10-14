import { fireEvent, render, renderHook, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination, paginate } from "@/components/molecules";
import { usePagination } from "@/hooks/usePagination";
import { pageNumbers } from "@/utils/pagination";

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("pageNumbers", () => {
  it("lists every page when there are few", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(pageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("skips ahead with gaps when there are many", () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, null, 20]);
    expect(pageNumbers(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pageNumbers(20, 20)).toEqual([1, null, 19, 20]);
  });
});

describe("usePagination", () => {
  it("shows the first 9, then the rest on the next page", () => {
    const { result } = renderHook(() => usePagination(items(20)));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageItems).toEqual(items(9));

    act(() => result.current.setPage(2));
    expect(result.current.pageItems).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);

    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([19, 20]);
  });

  it("has a single page for 9 or fewer", () => {
    const { result } = renderHook(() => usePagination(items(9)));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageItems).toHaveLength(9);
  });

  it("goes back to page 1 when the filter changes", () => {
    const { result, rerender } = renderHook(({ key }) => usePagination(items(30), key), { initialProps: { key: "All" } });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    rerender({ key: "Lashes" });
    expect(result.current.page).toBe(1);
  });

  it("never stays on a page that no longer exists", () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list), { initialProps: { list: items(30) } });
    act(() => result.current.setPage(4));
    rerender({ list: items(10) });
    expect(result.current.page).toBe(2);
  });
});

describe("Pagination control", () => {
  it("shows nothing for a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page, disables Previous on the first page and moves on click", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

describe("Pagination, the admin's pager", () => {
  it("shows the summary and at most five pages around the current one", () => {
    render(<Pagination page={6} totalPages={12} onPageChange={() => {}} summary={{ first: 51, last: 60, total: 118 }} />);
    expect(screen.getByText("Showing 51–60 of 118")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Page / }).map((b) => b.textContent)).toEqual(["4", "5", "6", "7", "8"]);
    expect(screen.getByRole("button", { name: "Page 6" })).toHaveAttribute("aria-current", "page");
  });
  it("with one page shows the summary but no page buttons", () => {
    render(<Pagination page={1} totalPages={1} onPageChange={() => {}} summary={{ first: 1, last: 3, total: 3 }} />);
    expect(screen.getByText("Showing 1–3 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("with one page and no summary renders nothing", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("slices a list into pages", () => {
    const view = paginate(Array.from({ length: 23 }, (_, i) => i), 3, 10);
    expect(view).toMatchObject({ rows: [20, 21, 22], pages: 3, current: 3, first: 21, last: 23, total: 23 });
  });
});

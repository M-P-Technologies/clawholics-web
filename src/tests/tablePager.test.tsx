import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TablePager, { paginate } from "@/components/shared/TablePager";

const items = Array.from({ length: 965 }, (_, i) => i); // 193 pages of 5
const pageNumbers = () => screen.getAllByRole("button", { name: /^Page \d+$/ }).map((b) => Number(b.textContent));

describe("TablePager", () => {
  it("shows at most five page numbers, starting at 1 on the first page", () => {
    render(<TablePager view={paginate(items, 1, 5)} onPage={vi.fn()} />);
    expect(pageNumbers()).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the current page in the middle of the five", () => {
    render(<TablePager view={paginate(items, 10, 5)} onPage={vi.fn()} />);
    expect(pageNumbers()).toEqual([8, 9, 10, 11, 12]);
    expect(screen.getByRole("button", { name: "Page 10" })).toHaveAttribute("aria-current", "page");
  });

  it("ends on the last five at the end", () => {
    render(<TablePager view={paginate(items, 193, 5)} onPage={vi.fn()} />);
    expect(pageNumbers()).toEqual([189, 190, 191, 192, 193]);
  });

  it("shows every page when there are five or fewer, and the arrows still move one page", () => {
    const onPage = vi.fn();
    render(<TablePager view={paginate(items.slice(0, 15), 2, 5)} onPage={onPage} />);
    expect(pageNumbers()).toEqual([1, 2, 3]);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
});

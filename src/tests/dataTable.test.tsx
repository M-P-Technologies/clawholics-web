import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";

describe("DataTable", () => {
  it("frames a table that scrolls sideways", () => {
    render(
      <TableFrame label="Bookings" minWidthClass="min-w-[720px]" head={<tr><th scope="col">Client</th></tr>}>
        <tr><td>Ana</td></tr>
      </TableFrame>,
    );
    const table = screen.getByRole("table", { name: "Bookings" });
    expect(table.className).toContain("min-w-[720px]");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
    expect(within(table).getByRole("columnheader", { name: "Client" })).toBeInTheDocument();
  });
  it("shows rows as cards on phones", () => {
    render(
      <RowCards label="Bookings">
        <RowCard><CardFields fields={[["Client", "Ana"], ["When", "Oct 20"]]} /></RowCard>
      </RowCards>,
    );
    expect(within(screen.getByRole("list", { name: "Bookings" })).getByText("Oct 20")).toBeInTheDocument();
  });
});

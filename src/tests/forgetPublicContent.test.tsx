import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import ForgetPublicContent from "@/lib/tanstack-query/ForgetPublicContent";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";

describe("ForgetPublicContent", () => {
  it("drops the public content cached in the tab, and nothing else", () => {
    const client = new QueryClient();
    const services = publicQueries.services().queryKey as readonly unknown[];
    const home = publicQueries.home().queryKey as readonly unknown[];
    client.setQueryData(services, [{ id: 1 }]);
    client.setQueryData(home, { home_title: "Old" });
    client.setQueryData(["dashboard"], { total: 3 });

    render(
      <QueryClientProvider client={client}>
        <ForgetPublicContent />
      </QueryClientProvider>,
    );

    expect(client.getQueryData(services)).toBeUndefined();
    expect(client.getQueryData(home)).toBeUndefined();
    expect(client.getQueryData(["dashboard"])).toEqual({ total: 3 });
  });
});

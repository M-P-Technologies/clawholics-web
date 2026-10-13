import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactUs from "../views/site/ContactUs";
import { fetchHomeContent } from "../services/contentService";

vi.mock("../services/contentService", () => ({
  fetchHomeContent: vi.fn(),
}));
// The page takes the address from About Us; that load isn't what these tests are about
vi.mock("../services/aboutService", () => ({
  fetchAboutContent: vi.fn(async () => ({ about_location: "7th 3rd St", about_location_url: "https://maps.test/salon" })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ContactUs Page UI and Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fetchHomeContent).mockResolvedValue({
      contact_title: "Get in Touch",
      contact_subtitle: "We'd love to hear from you",
      contact_phone: "123-456-7890",
      contact_email: "hello@clawholics.com",
    });
  });

  const renderComponent = () => {
    render(<ContactUs />);
  };

  it('TC-CU-01: should show inline error for invalid email format', async () => {
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('Any concerns? Message us!')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Testing the form' } });

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'jane@invalid' } });

    const form = screen.getByLabelText(/Name/i).closest("form");
    fireEvent.submit(form!);

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("TC-CU-02: should update the character counter when typing in description", async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText("Any concerns? Message us!")).toBeInTheDocument(),
    );

    const descInput = screen.getByLabelText(/Description/i);

    expect(screen.getByText("0/500")).toBeInTheDocument();

    fireEvent.change(descInput, { target: { value: "1234567890" } });

    expect(screen.getByText("10/500")).toBeInTheDocument();
  });

  it("TC-CU-03: should successfully submit to Cloudflare Worker with valid data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderComponent();
    await waitFor(() =>
      expect(screen.getByText("Any concerns? Message us!")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: "09123456789" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "I have a question about gel nails!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /SUBMIT/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/submit",
        expect.objectContaining({
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-clawholics-origin": "frontend",
          },
        }),
      );
    });
  });
});

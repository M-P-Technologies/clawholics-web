import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Faq from "@/app/(site)/faq/page";

const fetchFaqs = vi.fn();
vi.mock("@/services/faqService", () => ({ fetchFaqs: () => fetchFaqs() }));
const fetchHomeContent = vi.fn();
vi.mock("@/services/contentService", () => ({ fetchHomeContent: () => fetchHomeContent() }));

beforeEach(() => {
  fetchFaqs.mockReset();
  fetchHomeContent.mockReset().mockResolvedValue({});
});

describe("FAQ page", () => {
  it("lists the same questions the home page's FAQ section shows, with their answers", async () => {
    fetchFaqs.mockResolvedValue([
      { id: 1, question: "Do you take walk-ins?", answer: "Yes, when an artist is free.", display_order: 1 },
      { id: 2, question: "Is the deposit refundable?", answer: "No.", display_order: 2 },
    ]);
    render(<Faq />);
    expect(await screen.findByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    const first = screen.getByRole("button", { name: /Do you take walk-ins\?/ });
    expect(screen.getByRole("button", { name: /Is the deposit refundable\?/ })).toBeInTheDocument();
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Yes, when an artist is free.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
  });

  it("says so when there are no questions yet", async () => {
    fetchFaqs.mockResolvedValue([]);
    render(<Faq />);
    expect(await screen.findByText("No questions here yet")).toBeInTheDocument();
  });

  it("offers a retry when the questions can't load", async () => {
    fetchFaqs.mockRejectedValueOnce(new Error("down")).mockResolvedValue([]);
    render(<Faq />);
    fireEvent.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No questions here yet")).toBeInTheDocument();
  });

  it("shows the heading, intro and banner as edited in Admin > FAQs", async () => {
    fetchFaqs.mockResolvedValue([]);
    fetchHomeContent.mockResolvedValue({
      home_faq_page_title: "Good to know",
      home_faq_page_intro: "Our most asked questions.",
      home_faq_cta_title: "Ask us anything",
      home_faq_cta_primary_label: "Chat with us",
      home_faq_cta_primary_link: "https://m.me/clawholics",
    });
    render(<Faq />);
    expect(await screen.findByRole("heading", { name: "Good to know" })).toBeInTheDocument();
    expect(screen.getByText("Our most asked questions.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask us anything" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chat with us/ })).toHaveAttribute("href", "https://m.me/clawholics");
    // Never saved: the default
    expect(screen.getByRole("link", { name: /See services/ })).toHaveAttribute("href", "/services");
  });
});

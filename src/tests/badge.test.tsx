import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/atoms";
import { statusOf } from "@/lib/admin/clientPage";
import { statusDotTone } from "@/utils/profileView";

describe("Badge", () => {
  it("has the admin pill's tones", () => {
    render(<Badge tone="success">Completed</Badge>);
    expect(screen.getByText("Completed").className).toContain("bg-success/20");
  });
  it("can lead with a dot and be in capitals, like the client's status pill", () => {
    render(<Badge tone="neutral" dot="info" caps>Confirmed</Badge>);
    const pill = screen.getByText("Confirmed");
    expect(pill.className).toContain("uppercase");
    expect(pill.querySelector("[aria-hidden='true']")?.className).toContain("bg-info");
  });
});

describe("status tones", () => {
  it("maps the admin's statuses", () => {
    expect(statusOf("COMPLETED").tone).toBe("success");
    expect(statusOf("CONFIRMED").tone).toBe("brand");
    expect(statusOf("PENDING").tone).toBe("warning");
    expect(statusOf("CANCELLED").tone).toBe("danger");
    expect(statusOf("SOMETHING").tone).toBe("warning");
  });
  it("maps the client's status dots", () => {
    expect(statusDotTone("pending")).toBe("warning");
    expect(statusDotTone("awaiting_proof")).toBe("warning");
    expect(statusDotTone("Confirmed")).toBe("info");
    expect(statusDotTone("completed")).toBe("success");
    expect(statusDotTone("cancelled")).toBe("danger");
    expect(statusDotTone("refunded")).toBe("brand");
    expect(statusDotTone("other")).toBe("neutral");
  });
});

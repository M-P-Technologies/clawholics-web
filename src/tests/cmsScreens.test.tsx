import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Homepage from "@/app/(admin)/homepage/page";
import ContactUs from "@/app/(admin)/contact-info/page";
import AboutUs from "@/app/(admin)/about-us/page";
import NailServices from "@/app/(admin)/nail-services/page";
import NailArtists from "@/app/(admin)/nail-artists/page";
import FAQs from "@/app/(admin)/faqs/page";

// The Homepage editor draws about sixty fields; under a full parallel run its first render can
// pass the default 5s
vi.setConfig({ testTimeout: 15_000 });

vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div /> }));
const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

const home = {
  home_title: "Nails, done with love",
  home_services_subtitle: "Our menu",
  home_about_subtitle: "About",
  home_about_image: "https://img.test/about.jpg",
  home_hero_image: "https://img.test/hero.jpg",
  contact_subtitle: "Say hi",
  contact_phone: "09171234567",
  contact_email: "hi@salon.test",
  contact_location: "Cebu",
  contact_location_url: "https://maps.test/salon",
  social_facebook_name: "salon",
  social_facebook_url: "https://facebook.com/salon",
  social_instagram_name: "salon",
  social_instagram_url: "https://instagram.com/salon",
  social_tiktok_name: "salon",
  social_tiktok_url: "https://tiktok.com/@salon",
};
const fetchHomeContent = vi.fn();
const updateHomeContent = vi.fn();
const updateTeamContent = vi.fn();
vi.mock("@/services/contentService", () => ({
  fetchHomeContent: () => fetchHomeContent(),
  updateHomeContent: (...a: unknown[]) => updateHomeContent(...a),
  fetchTeamContent: async () => ({ team_description: "Our reliable artists" }),
  updateTeamContent: (...a: unknown[]) => updateTeamContent(...a),
}));
vi.mock("@/services/nailistService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/nailistService")>()),
  fetchNailists: async () => [],
}));
vi.mock("@/services/catalogService", () => ({ fetchCategories: async () => [] }));
vi.mock("@/services/faqService", () => ({
  fetchFaqs: async () => [{ id: 1, question: "Do you take walk-ins?", answer: "Yes", display_order: 1 }],
  updateFaq: vi.fn(),
  createFaq: vi.fn(),
  deleteFaq: vi.fn(),
}));
vi.mock("@/services/serviceService", () => ({
  fetchServices: async () => [
    { id: 1, name: "Gel manicure", image: "https://img.test/gel.jpg", duration: "1 hr", pricing_type: "flat", price: 500 },
    { id: 2, name: "Lash lift", image: "", duration: "1 hr", pricing_type: "flat", price: 700 },
  ],
}));
const about = {
  about_description: "Our story",
  about_image: "https://img.test/about.jpg",
  about_location: "Cebu",
  about_location_url: "https://maps.test/salon",
  about_business_hours_Monday: "Monday 9 AM - 8 PM",
  about_business_hours_Tuesday: "Tuesday 9 AM - 8 PM",
  about_business_hours_Wednesday: "Wednesday 9 AM - 8 PM",
  about_business_hours_Thursday: "Thursday 9 AM - 8 PM",
  about_business_hours_Friday: "Friday 9 AM - 8 PM",
  about_business_hours_Saturday: "Saturday 9 AM - 8 PM",
  about_business_hours_Sunday: "Sunday 9 AM - 8 PM",
};
const updateAboutContent = vi.fn();
vi.mock("@/services/aboutService", () => ({
  fetchAboutContent: async () => ({ ...about }),
  updateAboutContent: (...a: unknown[]) => updateAboutContent(...a),
  uploadAboutImage: vi.fn(),
}));
const updateCarousel = vi.fn();
const fetchCarousel = vi.fn();
vi.mock("@/services/carouselService", () => ({
  fetchCarousel: () => fetchCarousel(),
  updateCarousel: (...a: unknown[]) => updateCarousel(...a),
}));

beforeEach(() => {
  show.mockReset();
  fetchHomeContent.mockReset().mockResolvedValue({ ...home });
  updateHomeContent.mockReset().mockResolvedValue({});
  updateCarousel.mockReset().mockResolvedValue({});
  updateAboutContent.mockReset().mockResolvedValue({});
  updateTeamContent.mockReset().mockResolvedValue({});
  fetchCarousel.mockReset().mockResolvedValue([{ id: 1, image_url: "https://img.test/one.jpg", position: 1 }]);
});

describe("Homepage editor", () => {
  it("edits beside a preview, and saves the trimmed changes", async () => {
    render(<Homepage />);
    const headline = await screen.findByRole("textbox", { name: "Headline" });
    expect(screen.getByTitle("Preview of Home")).toHaveAttribute("src", "/");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(headline, { target: { value: "  New headline  " } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(updateHomeContent.mock.calls[0][0]).toMatchObject({ home_title: "New headline", home_about_subtitle: "About" });
    // Edited in Services, so the Homepage can't put an older one back
    expect(updateHomeContent.mock.calls[0][0]).not.toHaveProperty("home_services_subtitle");
    expect(updateCarousel).not.toHaveBeenCalled(); // the studio gallery is edited in About Us
    expect(show).toHaveBeenCalledWith("success", "Homepage saved", expect.any(String));
  });

  it("puts the changes back on Discard", async () => {
    render(<Homepage />);
    const headline = await screen.findByRole("textbox", { name: "Headline" });
    fireEvent.change(headline, { target: { value: "Oops" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(headline).toHaveValue("Nails, done with love");
    expect(screen.getByText("Live on the site")).toBeInTheDocument();
  });

});

describe("About Us editor: the studio gallery", () => {
  it("saves the gallery's photos with the About content", async () => {
    render(<AboutUs />);
    const story = await screen.findByRole("textbox", { name: "Description" });
    expect(screen.getByRole("region", { name: "Studio gallery" })).toHaveTextContent("1/10");
    fireEvent.change(story, { target: { value: "A new story" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateCarousel).toHaveBeenCalled());
    expect(updateAboutContent.mock.calls[0][0]).toMatchObject({ about_description: "A new story" });
    expect(updateCarousel.mock.calls[0][0]).toEqual([{ id: 1, image_url: "https://img.test/one.jpg", position: 1 }]);
  });

  it("removes a gallery photo, and won't save an empty gallery", async () => {
    render(<AboutUs />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove one.jpg" }));
    expect(screen.getByRole("region", { name: "Studio gallery" })).toHaveTextContent("0/10");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(show).toHaveBeenCalledWith("error", "Add at least one photo", expect.any(String));
    expect(updateAboutContent).not.toHaveBeenCalled();
  });
});

describe("Homepage editor when the content can't load", () => {
  it("shows no form to save over the live content, and loads it on Try again", async () => {
    fetchHomeContent.mockRejectedValueOnce(new Error("Failed to fetch content"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Homepage />);
    expect(await screen.findByText("We couldn't load the homepage")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("textbox", { name: "Headline" })).toHaveValue("Nails, done with love");
  });
});

describe("Homepage editor: the home page's sections", () => {
  it("picks the site's colour set and its display, script and body fonts, and saves them", async () => {
    render(<Homepage />);
    const look = within(await screen.findByRole("region", { name: "Look" }));
    expect(look.getByRole("radio", { name: "Clawholics pink" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(look.getByRole("radio", { name: "Lavender" }));
    fireEvent.click(within(look.getByRole("radiogroup", { name: "Display font (headings)" })).getByRole("radio", { name: "Playfair Display" }));
    fireEvent.click(within(look.getByRole("radiogroup", { name: "Body font (text and buttons)" })).getByRole("radio", { name: "Nunito" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(updateHomeContent.mock.calls[0][0]).toMatchObject({
      home_theme_palette: "lavender",
      home_theme_display: "playfair",
      home_theme_body: "nunito",
    });
  });

  it("picks a card icon from the twelve and saves it with the card", async () => {
    render(<Homepage />);
    const icons = await screen.findAllByRole("radiogroup", { name: "Icon" });
    expect(icons).toHaveLength(4);
    expect(within(icons[0]).getAllByRole("radio")).toHaveLength(12);
    expect(within(icons[0]).getByRole("radio", { name: "Sparkles" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(icons[0]).getByRole("radio", { name: "Eye (lashes)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(updateHomeContent.mock.calls[0][0]).toMatchObject({ home_feature_1_icon: "eye", home_feature_1_title: "Nails and lashes", home_strip: "" });
  });

  it("chooses the strip's slides, starting from the services with photos, and saves a title", async () => {
    render(<Homepage />);
    fireEvent.click(await screen.findByRole("button", { name: "Choose the slides" }));
    const title = screen.getByRole("textbox", { name: "Title on the photo" });
    expect(title).toHaveAttribute("placeholder", "Gel manicure");
    fireEvent.change(title, { target: { value: "Gel mani" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(JSON.parse(updateHomeContent.mock.calls[0][0].home_strip)).toEqual([{ serviceId: 1, title: "Gel mani", image: "" }]);
  });

  it("won't save a footer chat link that isn't a web address", async () => {
    render(<Homepage />);
    const link = (await screen.findAllByRole("textbox", { name: "Link" }))[0];
    fireEvent.change(link, { target: { value: "messenger" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(show).toHaveBeenCalledWith("error", "Please check the form", expect.stringMatching(/chat link/));
    expect(updateHomeContent).not.toHaveBeenCalled();
  });

  it("points to the screens that edit the artists, quick contact and FAQ questions", async () => {
    render(<Homepage />);
    expect(await screen.findByRole("link", { name: /Edit in Artists/ })).toHaveAttribute("href", "/nail-artists");
    expect(screen.getByRole("link", { name: /Edit in About Us/ })).toHaveAttribute("href", "/about-us");
    expect(screen.getByRole("link", { name: /Edit in FAQs/ })).toHaveAttribute("href", "/faqs");
  });
});

describe("Services editor: the page's words", () => {
  it("edits the subtitle and saves only the Services page's words", async () => {
    render(<NailServices />);
    const subtitle = await screen.findByRole("textbox", { name: "Subtitle" });
    expect(subtitle).toHaveValue("Our menu");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(subtitle, { target: { value: "  Every set, made with care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    const saved = updateHomeContent.mock.calls[0][0];
    expect(saved).toMatchObject({ home_services_title: "Nail services", home_services_subtitle: "Every set, made with care", home_services_cta_title: "Not sure what to get?" });
    expect(saved).not.toHaveProperty("home_title");
    expect(await screen.findByText("Live on the site")).toBeInTheDocument();
  });

  it("points the banner's buttons at a page of the site or a web address", async () => {
    render(<NailServices />);
    const banner = within(await screen.findByRole("region", { name: "Bottom banner" }));
    // The main button starts on the Facebook page, a web address
    expect(banner.getByRole("textbox", { name: "Web address" })).toHaveValue("https://www.facebook.com/clawholicsbymax");
    fireEvent.change(banner.getByRole("textbox", { name: "Web address" }), { target: { value: "facebook" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(show).toHaveBeenCalledWith("error", "Please check the page's words", expect.stringMatching(/main button must open a page of the site or a full web address/));
    expect(updateHomeContent).not.toHaveBeenCalled();
  });
});

describe("Artists editor: the page's words", () => {
  it("edits the heading, intro and strip title, and saves only those", async () => {
    render(<NailArtists />);
    const heading = await screen.findByRole("textbox", { name: "Heading" });
    expect(heading).toHaveValue("Meet our artists");
    expect(screen.getByRole("textbox", { name: "Intro" })).toHaveValue("Our reliable artists");
    expect(screen.getByRole("textbox", { name: "Photo strip title" })).toHaveValue("Their art");
    fireEvent.change(heading, { target: { value: " The team " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateTeamContent).toHaveBeenCalledWith({ team_title: "The team", team_description: "Our reliable artists", team_art_title: "Their art" }, "tok", "admin_1"));
    expect(updateHomeContent).not.toHaveBeenCalled();
  });
});

describe("FAQs editor: the FAQ page's words", () => {
  it("edits the page's heading and banner beside the questions, and saves only those words", async () => {
    render(<FAQs />);
    // The page heading's field, then the banner's
    const headings = await screen.findAllByRole("textbox", { name: "Heading" });
    expect(headings[0]).toHaveValue("Frequently asked questions");
    expect(screen.getByRole("region", { name: "Questions" })).toHaveTextContent("Do you take walk-ins?");
    fireEvent.change(headings[1], { target: { value: "Still curious?" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    const saved = updateHomeContent.mock.calls[0][0];
    expect(saved).toMatchObject({ home_faq_cta_title: "Still curious?", home_faq_page_title: "Frequently asked questions", home_faq_cta_primary_link: "/contact" });
    expect(Object.keys(saved).every((key) => key.startsWith("home_faq_"))).toBe(true);
  });
});

describe("Contact editor", () => {
  it("starts from the three links the site had, and saves the details and the links in one request", async () => {
    render(<ContactUs />);
    const email = await screen.findByRole("textbox", { name: "Email" });
    expect(screen.getByRole("region", { name: "Social media" })).toHaveTextContent("3/10");
    fireEvent.change(email, { target: { value: "hello@salon.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalledTimes(1));
    const saved = updateHomeContent.mock.calls[0][0];
    expect(saved).toMatchObject({ contact_subtitle: "Say hi", contact_phone: "09171234567", contact_email: "hello@salon.test" });
    expect(JSON.parse(saved.social_links)).toEqual([
      { platform: "facebook", name: "salon", url: "https://facebook.com/salon" },
      { platform: "instagram", name: "salon", url: "https://instagram.com/salon" },
      { platform: "tiktok", name: "salon", url: "https://tiktok.com/@salon" },
    ]);
    // The address is edited in About Us
    expect(saved).not.toHaveProperty("contact_location");
    expect(saved).not.toHaveProperty("home_title");
  });

  it("adds a link with its platform icon, and checks it before saving", async () => {
    render(<ContactUs />);
    fireEvent.click(await screen.findByRole("button", { name: "Add a social link" }));
    const pickers = screen.getAllByRole("radiogroup", { name: "Platform" });
    expect(within(pickers[3]).getAllByRole("radio")).toHaveLength(12);
    fireEvent.click(within(pickers[3]).getByRole("radio", { name: "YouTube" }));
    const names = screen.getAllByRole("textbox", { name: "Username" });
    const urls = screen.getAllByRole("textbox", { name: "Link" });
    fireEvent.change(names[3], { target: { value: "Clawholics" } });
    fireEvent.change(urls[3], { target: { value: "youtube.com/clawholics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(show).toHaveBeenCalledWith("error", "Please check the form", "The YouTube link must be a full web address, starting with https://. Nothing was saved.");
    fireEvent.change(urls[3], { target: { value: "https://youtube.com/@clawholics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(JSON.parse(updateHomeContent.mock.calls[0][0].social_links)[3]).toEqual({ platform: "youtube", name: "Clawholics", url: "https://youtube.com/@clawholics" });
  });

  it("removes and reorders links", async () => {
    render(<ContactUs />);
    fireEvent.click(await screen.findByRole("button", { name: "Move the Instagram link up" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[2]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHomeContent).toHaveBeenCalled());
    expect(JSON.parse(updateHomeContent.mock.calls[0][0].social_links).map((l: { platform: string }) => l.platform)).toEqual(["instagram", "facebook"]);
  });

  it("points to About Us for the address", async () => {
    render(<ContactUs />);
    expect(await screen.findByRole("link", { name: /Edit in About Us/ })).toHaveAttribute("href", "/about-us");
    expect(screen.queryByRole("textbox", { name: "Address" })).toBeNull();
  });
});

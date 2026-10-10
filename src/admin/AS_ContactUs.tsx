"use client";

import { useEffect, useState } from "react";
import AS_SideBar from "../components/admin/AS_SideBar";
import { fetchHomeContent } from "../services/contentService";
import AS_ContactUsDropdown from "../components/admin/AS_ContactUsDropdown";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import Button from "../components/ui/Button";

export default function AS_ContactUs() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [content, setContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchHomeContent();
      setContent(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load contact content.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalUpdate = (updatedValues: Record<string, string>) => {
    setContent((prev) => ({ ...prev, ...updatedValues }));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading contact details" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:h-screen px-2 py-2 sm:px-4 sm:py-4 bg-light-orange overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex flex-wrap justify-between items-center gap-4 w-full">
            <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
              Contact Us
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <p className="text-gray-red text-lg">{error}</p>
              <Button
                type="button"
                onClick={loadContent}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AS_ContactUsDropdown
                title="Contact Us"
                type="group"
                fields={[{ label: "Subheading", key: "contact_subtitle" }]}
                content={content}
                onUpdated={handleLocalUpdate}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />

              <AS_ContactUsDropdown
                title="Social Media"
                type="social"
                content={content}
                onUpdated={handleLocalUpdate}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />

              <AS_ContactUsDropdown
                title="Business Information"
                type="group"
                fields={[
                  { label: "Phone Number", key: "contact_phone" },
                  { label: "Email", key: "contact_email" },
                  { label: "Location", key: "contact_location" },
                  { label: "Location URL Link", key: "contact_location_url" },
                ]}
                content={content}
                onUpdated={handleLocalUpdate}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
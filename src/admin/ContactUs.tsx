"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { fetchHomeContent } from "../services/contentService";
import ContactUsDropdown from "../components/admin/ContactUsDropdown";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import Button from "../components/ui/Button";

export default function ContactUs() {
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
    <AdminShell title="Contact Us">

        <div className="flex-1 overflow-y-auto pb-2">
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
              <ContactUsDropdown
                title="Contact Us"
                type="group"
                fields={[{ label: "Subheading", key: "contact_subtitle" }]}
                content={content}
                onUpdated={handleLocalUpdate}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />

              <ContactUsDropdown
                title="Social Media"
                type="social"
                content={content}
                onUpdated={handleLocalUpdate}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />

              <ContactUsDropdown
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
      
    </AdminShell>
  );
}
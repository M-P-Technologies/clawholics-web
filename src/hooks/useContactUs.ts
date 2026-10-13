import { usePreviewVersion } from "@/lib/cmsPreview";
import { lastSeen } from "../utils/lastSeen";
import React, { useEffect, useState } from "react";
import { type ModalType } from "../components/ui/FeedbackModal";
import { fetchHomeContent } from "../services/contentService";
import { fetchAboutContent } from "../services/aboutService";
import { withSalonLocation } from "../lib/homeSections";
import { API_BASE_URL } from "../apiConfig";
import type { ChangeEvent } from "react";
import { CONTACT_FIELDS } from "../data/contactUs";

export function useContactUs() {
  const [pageData, setPageData] = useState<Record<string, string> | null>(() => lastSeen("home") ?? null);
  const [isPageLoading, setIsPageLoading] = useState(() => !lastSeen("home"));
  const [pageError, setPageError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    description: "",
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
  }>({ isOpen: false, type: "success" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    const loadPageContent = async () => {
      try {
        if (!lastSeen("home")) setIsPageLoading(true);
        setPageError("");
        const [data, about] = await Promise.all([fetchHomeContent(), fetchAboutContent().catch(() => null)]);
        // The address and map link are edited in About Us
        setPageData(withSalonLocation(data, about));
      } catch (err) {
        console.error("Failed to load page content", err);
        setPageError("Failed to load contact information.");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadPageContent();
  }, [previewVersion]);

  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const sanitizedValue = value.replace(/[^0-9+\-\s()]/g, "");
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clawholics-origin": "frontend",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setModalState({ isOpen: true, type: "success" });
        setFormData({ name: "", email: "", mobile: "", description: "" });
      } else {
        setModalState({ isOpen: true, type: "generalError" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // fetch only throws when the request never reached the server
      setModalState({ isOpen: true, type: "networkError" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setEmailError("");
  };

  const reloadPage = () => window.location.reload();

  // The plain text inputs with everything they need: value, handler and error
  const contactFields = CONTACT_FIELDS.map((field) => ({
    ...field,
    value: formData[field.name as "name" | "email" | "mobile"],
    onChange: field.name === "email" ? handleEmailChange : handleChange,
    error: field.name === "email" ? emailError : "",
  }));

  // The message box allows 500 characters; the counter turns red once it is full
  const descriptionLength = formData.description.length;
  const isDescriptionFull = descriptionLength >= 500;

  return { descriptionLength, isDescriptionFull, contactFields, pageData, isPageLoading, pageError, emailError, setEmailError, formData, modalState, isSubmitting, closeModal, handleChange, handleSubmit, handleEmailChange, reloadPage };
}

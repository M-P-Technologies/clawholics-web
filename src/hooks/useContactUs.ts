import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { CONTACT_FEEDBACK, type ContactFeedback } from "@/lib/contactFeedback";
import { platformOf, readSocialLinks, socialHref } from "@/lib/socialLinks";
import { DEFAULT_HERO_IMAGE } from "@/data/home";
import { withSalonLocation } from "../lib/homeSections";
import { API_BASE_URL } from "../apiConfig";
import type { ChangeEvent } from "react";
import { CONTACT_FIELDS } from "../data/contactUs";

export function useContactUs() {
  const homeQuery = useQuery(publicQueries.home());
  const aboutQuery = useQuery(publicQueries.about());
  const home = homeQuery.data;
  const about = aboutQuery.data;
  // The address and map link are edited in About Us; the page waits for them, but works without
  const aboutSettled = !aboutQuery.isPending;
  const pageData = useMemo(
    () => (home && aboutSettled ? withSalonLocation(home, about ?? null) : null),
    [home, about, aboutSettled],
  );
  // A failed refresh keeps showing the copy already loaded
  const pageError = homeQuery.isError && !home ? "Failed to load contact information." : "";
  const isPageLoading = !pageData && !pageError;
  const [emailError, setEmailError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    description: "",
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ContactFeedback;
  }>({ isOpen: false, type: "success" });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // The social links as edited in Admin > Contact Us, each with its platform's name and icon
  const socialLinks = pageData
    ? readSocialLinks(pageData).map((link) => ({ name: link.name, href: socialHref(link), ...platformOf(link.platform) }))
    : [];
  const heroImage = pageData?.home_hero_image || DEFAULT_HERO_IMAGE;
  // The dialog after sending: its words, and whether it's an error
  const feedback = modalState.type ? CONTACT_FEEDBACK[modalState.type] : null;
  const feedbackDialog = {
    open: modalState.isOpen && !!modalState.type,
    title: feedback?.title ?? "",
    message: feedback?.message ?? "",
    isError: modalState.type !== "success",
  };

  return { socialLinks, heroImage, feedbackDialog, descriptionLength, isDescriptionFull, contactFields, pageData, isPageLoading, pageError, emailError, setEmailError, formData, modalState, isSubmitting, closeModal, handleChange, handleSubmit, handleEmailChange, reloadPage };
}

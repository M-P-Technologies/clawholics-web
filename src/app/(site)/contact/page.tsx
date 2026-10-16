"use client";

import { Mail,MapPin,Phone } from "lucide-react";
import { Button, LoadingBar } from "@/components/atoms";
import { FeedbackDialog } from "@/components/organisms";
import { ContactGroup, FormField, SectionHeader } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import { contactLinkLightClass, inputClass, labelClass } from "@/components/tokens";
import { useContactUs } from "@/hooks/useContactUs";

export default function ContactUs() {
  const { socialLinks, heroImage, feedbackDialog, descriptionLength, isDescriptionFull, contactFields, pageData, isPageLoading, pageError, formData, isSubmitting, closeModal, handleChange, handleSubmit, reloadPage } = useContactUs();

  if (isPageLoading) {
    return <LoadingBar label="Loading" />;
  }

  if (pageError || !pageData) {
    return (
      <PageShell>
        <Section innerClassName="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-xl text-gray-red">{pageError || "Unable to load contact info."}</p>
          <Button type="button" onClick={reloadPage} >
            Retry
          </Button>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Section>
        <SectionHeader title="Contact us" subtitle={pageData.contact_subtitle} />

        <Panel className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col gap-3 md:gap-6">
            <h2 className="font-display text-xl font-normal uppercase tracking-widest text-gray-red">
              Any concerns? Message us!
            </h2>

            <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="flex flex-col gap-3">
              {contactFields.map((field) => (
                <FormField key={field.id} {...field} />
              ))}

              <div>
                <div className="flex items-end justify-between">
                  <label htmlFor="description" className={labelClass}>
                    Description
                  </label>
                  <span
                    aria-live="polite"
                    className={`mb-1.5 text-sm ${
                      isDescriptionFull ? "font-bold text-danger-ink" : "text-gray-red"
                    }`}
                  >
                    {descriptionLength}/500
                  </span>
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={500}
                  required
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                aria-disabled={isSubmitting}
                className="w-full sm:w-fit sm:self-end"
              >
                {isSubmitting ? "Sending..." : "Submit"}
              </Button>
            </form>
          </div>
        </Panel>

        {/* A wide photo across the whole screen, darkened, with the contact details on it. Its
            negative bottom margin cancels the section's padding, so it sits against the footer */}
        <div className="relative left-1/2 -mb-15 w-screen -translate-x-1/2 overflow-hidden lg:-mb-24">
        <img
          src={heroImage}
          alt="Hands with freshly done soft gel nails"
          loading="lazy"
          style={{ objectPosition: "50% 45%" }}
          className="absolute inset-0 h-full w-full max-w-none object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gray-red/70" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-9 px-3 py-15 md:flex-row md:justify-between md:gap-12 md:px-9 lg:py-24">
        <ContactGroup title="Connect with us on social media!">
          {/* As edited in Admin > Contact Us */}
          {socialLinks.map(({ name, href, label, Icon }, index) => (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit our ${label} page: ${name}`}
              className={contactLinkLightClass}
            >
              <Icon className="h-6 w-6 shrink-0 text-crimson" />
              <span>{name}</span>
            </a>
          ))}
        </ContactGroup>

        <ContactGroup title="Business information">
          <a href={`tel:${pageData.contact_phone}`} className={contactLinkLightClass}>
            <Phone size={24} className="shrink-0 text-crimson" aria-hidden="true" />
            <span>{pageData.contact_phone}</span>
          </a>
          <a href={`mailto:${pageData.contact_email}`} className={contactLinkLightClass}>
            <Mail size={24} className="shrink-0 text-crimson" aria-hidden="true" />
            <span className="truncate">{pageData.contact_email}</span>
          </a>
          <a
            href={pageData.contact_location_url}
            target="_blank"
            rel="noopener noreferrer"
            className={contactLinkLightClass}
          >
            <MapPin size={24} className="mt-0.5 shrink-0 text-crimson" aria-hidden="true" />
            <span>{pageData.contact_location}</span>
          </a>
        </ContactGroup>
        </div>
        </div>
      </Section>

      <FeedbackDialog
        open={feedbackDialog.open}
        title={feedbackDialog.title}
        message={feedbackDialog.message}
        isError={feedbackDialog.isError}
        onClose={closeModal}
      />
    </PageShell>
  );
}

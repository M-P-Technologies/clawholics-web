"use client";

import { Mail,MapPin,Phone } from "lucide-react";
import { Button } from "@/components/atoms";
import FeedbackModal from "../../components/ui/FeedbackModal";
import { LoadingBar } from "@/components/atoms";
import { ContactGroup, FormField, SectionHeader } from "@/components/molecules";
import PageShell from "../../components/layout/PageShell";
import Panel from "../../components/layout/Panel";
import ImageBanner from "../../components/home/ImageBanner";
import { DEFAULT_HERO_IMAGE } from "../../data/home";
import Section from "../../components/layout/Section";
import { platformOf, readSocialLinks, socialHref } from "../../lib/socialLinks";
import { contactLinkLightClass, inputClass, labelClass } from "@/components/tokens";
import { useContactUs } from "../../hooks/useContactUs";

export default function ContactUs() {
  const { descriptionLength, isDescriptionFull, contactFields, pageData, isPageLoading, pageError, formData, modalState, isSubmitting, closeModal, handleChange, handleSubmit, reloadPage } = useContactUs();

  if (isPageLoading) {
    return <LoadingBar label="Loading" />;
  }

  if (pageError || !pageData) {
    return (
      <PageShell>
        <Section innerClassName="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
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
          <div className="flex flex-col gap-4 md:gap-8">
            <h3 className="font-display text-xl font-normal uppercase tracking-widest text-gray-red">
              Any concerns? Message us!
            </h3>

            <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="flex flex-col gap-4">
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
                      isDescriptionFull ? "font-bold text-danger" : "text-gray-red/70"
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

        <ImageBanner image={pageData.home_hero_image || DEFAULT_HERO_IMAGE} alt="Hands with freshly done soft gel nails" focus="50% 45%">
        <ContactGroup title="Connect with us on social media!">
          {/* As edited in Admin > Contact Us */}
          {readSocialLinks(pageData).map((link, index) => {
            const { label, Icon } = platformOf(link.platform);
            return (
              <a
                key={index}
                href={socialHref(link)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit our ${label} page: ${link.name}`}
                className={contactLinkLightClass}
              >
                <Icon className="h-6 w-6 shrink-0 text-crimson" />
                <span>{link.name}</span>
              </a>
            );
          })}
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
        </ImageBanner>
      </Section>

      <FeedbackModal isOpen={modalState.isOpen} type={modalState.type} onClose={closeModal} />
    </PageShell>
  );
}

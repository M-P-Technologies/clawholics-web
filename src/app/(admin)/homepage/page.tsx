"use client";

import CmsEditor, { CmsLoadError } from "@/components/features/admin/cms/CmsEditor";
import { ElsewhereNote, IconPicker, ImageField, LinkField, PanelSection, SaveBar, SelectField, SubCard, TextField } from "@/components/features/admin/cms/fields";
import StripEditor from "@/components/features/admin/cms/StripEditor";
import { FontPicker, PalettePicker } from "@/components/features/admin/cms/ThemePickers";
import { CmsEditorSkeleton } from "@/components/features/admin/skeletons/skeletons";
import emblem from "@/assets/logo/emblem-pink.png";
import footerLogo from "@/assets/logo/logo-pink-transparent.png";
import { useArtistWorkPhotos } from "@/hooks/admin/useArtistWorkPhotos";
import { useHomeEditor } from "@/hooks/admin/useHomeEditor";
import { HOME_PREVIEW_PAGES } from "@/lib/admin/cmsPages";
import { FEATURE_ICONS, FEATURE_TEXT_MAX, FEATURE_TITLE_MAX, MAX_STRIP_SLIDES, SITE_LINK_OPTIONS } from "@/lib/homeSections";
import { BODY_FONTS, DISPLAY_FONTS, SCRIPT_FONTS } from "@/lib/siteTheme";

// Everything on the home page that isn't edited elsewhere, top to bottom, and the footer of every
// page, beside a live preview. (The studio gallery's photos are edited in About Us.) The blocks
// that come from other screens (artists, quick contact, FAQ questions) say where to edit them.
// Its state, uploads and saving are in hooks/admin/useHomeEditor.
export default function Homepage() {
  const editor = useHomeEditor();
  const workPhotos = useArtistWorkPhotos();
  const { content, sections, services, set, setText, setFeature, setStrip, uploadTo, uploading } = editor;
  const t = sections.text;

  if (editor.isLoading) return <CmsEditorSkeleton title="Homepage" />;

  if (editor.loadFailed) return <CmsLoadError title="Homepage" what="the homepage" onRetry={editor.retry} />;

  return (
    <CmsEditor
      title="Homepage"
      pages={HOME_PREVIEW_PAGES}
      drafts={{ home: editor.draft }}
      refreshKey={editor.refreshKey}
      header={<SaveBar dirty={editor.dirty} saving={editor.isSaving} busy={editor.busy} onSave={editor.save} onDiscard={editor.discard} />}
    >
      <PanelSection title="Look" description="The colours and fonts of the whole public site. The preview shows each choice straight away." page="/">
        <PalettePicker value={t.home_theme_palette} onChange={setText("home_theme_palette")} />
        <FontPicker label="Display font (headings)" fonts={DISPLAY_FONTS} value={t.home_theme_display} onChange={setText("home_theme_display")} sample="Clawholics nails" size="large" />
        <FontPicker label="Script font (accents)" fonts={SCRIPT_FONTS} value={t.home_theme_script} onChange={setText("home_theme_script")} sample="by Max" size="large" />
        <FontPicker label="Body font (text and buttons)" fonts={BODY_FONTS} value={t.home_theme_body} onChange={setText("home_theme_body")} sample="Book your next set in a few taps." size="small" />
      </PanelSection>

      <PanelSection title="Hero" description="The first thing visitors see: the headline over the big photo." page="/">
        <TextField label="Headline" value={content.home_title} onChange={set("home_title")} rows={2} />
        <TextField label="Paragraph" value={t.home_hero_text} onChange={setText("home_hero_text")} rows={3} />
        <ImageField label="Hero photo" value={content.home_hero_image} uploading={!!uploading.home_hero_image} onUpload={uploadTo("home_hero_image")} onRemove={() => set("home_hero_image")("")} hint="A wide photo works best. It sits beside the headline." />
      </PanelSection>

      <PanelSection title="Why choose us" description="The four cards under the hero. Each opens a page of the site." page="/#why-choose-us">
        <TextField label="Heading" value={t.home_features_title} onChange={setText("home_features_title")} />
        {sections.features.map((feature, i) => (
          <SubCard key={i} title={`Card ${i + 1}`}>
            <IconPicker label="Icon" value={feature.icon} icons={FEATURE_ICONS} onChange={setFeature(i, "icon")} />
            <TextField label="Title" value={feature.title} onChange={setFeature(i, "title")} maxLength={FEATURE_TITLE_MAX} />
            <TextField label="Description" value={feature.text} onChange={setFeature(i, "text")} rows={3} maxLength={FEATURE_TEXT_MAX} />
            <SelectField label="Opens" value={feature.link} options={SITE_LINK_OPTIONS} onChange={setFeature(i, "link")} />
          </SubCard>
        ))}
      </PanelSection>

      <PanelSection title="Studio intro" description="The paragraph beside the emblem. The emblem shows on computers, not phones." page="/#studio-intro">
        <TextField label="Small label" value={t.home_offer_eyebrow} onChange={setText("home_offer_eyebrow")} />
        <TextField label="Paragraph" value={t.home_offer_text} onChange={setText("home_offer_text")} rows={5} />
        <TextField label="Link text" value={t.home_offer_link_label} onChange={setText("home_offer_link_label")} />
        <SelectField label="Link opens" value={t.home_offer_link} options={SITE_LINK_OPTIONS} onChange={setText("home_offer_link")} />
        <ImageField
          label="Emblem"
          value={sections.offerImage}
          fallback={emblem.src}
          fit="contain"
          uploading={!!uploading.offerImage}
          onUpload={editor.uploadSectionImage("offerImage")}
          onRemove={editor.clearSectionImage("offerImage")}
          hint="A square picture works best. Use the default to show the Clawholics emblem again."
        />
      </PanelSection>

      <PanelSection title="Service photo strip" description="The sliding photos of services, each with its price, hours and a Book button." page="/#service-strip" aside={sections.strip ? `${sections.strip.length}/${MAX_STRIP_SLIDES}` : undefined}>
        <StripEditor services={services} strip={sections.strip} onChange={setStrip} choices={workPhotos.photos} choicesLoading={workPhotos.isLoading} />
      </PanelSection>

      <PanelSection title="About us" description="The short story with a link to the About page." page="/#about-teaser">
        <TextField label="Small label" value={t.home_about_eyebrow} onChange={setText("home_about_eyebrow")} />
        <TextField label="Heading" value={t.home_about_heading} onChange={setText("home_about_heading")} rows={2} />
        <TextField label="Paragraph" value={t.home_about_text} onChange={setText("home_about_text")} rows={4} />
        <TextField label="Button text" value={t.home_about_link_label} onChange={setText("home_about_link_label")} />
      </PanelSection>

      <PanelSection title="Artist spotlight" page="/#artist-spotlight">
        <ElsewhereNote to="/nail-artists" screen="Artists">
          The artists, their photos, titles and stories come from the Artists screen. Whatever you change there shows here too.
        </ElsewhereNote>
      </PanelSection>

      <PanelSection title="Quick contact" page="/#quick-contact">
        <ElsewhereNote to="/about-us" screen="About Us">
          The map, address, opening times and the Good to know list come from the About Us screen. Whatever you change there shows here too.
        </ElsewhereNote>
      </PanelSection>

      <PanelSection title="Client reviews" description="Shown only when at least one review is approved." page="/#reviews">
        <TextField label="Heading" value={t.home_reviews_title} onChange={setText("home_reviews_title")} />
        <ElsewhereNote to="/clients" screen="Clients & Bookings">
          Clients review their completed visits. Open a client, then approve a review in their Appointments tab to show it here.
        </ElsewhereNote>
      </PanelSection>

      <PanelSection title="Frequently asked questions" page="/#faq">
        <TextField label="Heading" value={t.home_faq_title} onChange={setText("home_faq_title")} />
        <ElsewhereNote to="/faqs" screen="FAQs">
          The questions and answers come from the FAQs screen, and also show on the FAQ page. Whatever you change there shows here too.
        </ElsewhereNote>
      </PanelSection>

      <PanelSection title="Closing banner" description="The last call to action before the footer." page="/#closing-banner">
        <TextField label="Heading" value={t.home_cta_title} onChange={setText("home_cta_title")} rows={2} />
        <TextField label="Paragraph" value={t.home_cta_text} onChange={setText("home_cta_text")} rows={2} />
        <SubCard title="Main button">
          <TextField label="Text" value={t.home_cta_primary_label} onChange={setText("home_cta_primary_label")} />
          <LinkField label="Opens" value={t.home_cta_primary_link} pages={SITE_LINK_OPTIONS} onChange={setText("home_cta_primary_link")} />
        </SubCard>
        <SubCard title="Second button">
          <TextField label="Text" value={t.home_cta_secondary_label} onChange={setText("home_cta_secondary_label")} />
          <LinkField label="Opens" value={t.home_cta_secondary_link} pages={SITE_LINK_OPTIONS} onChange={setText("home_cta_secondary_link")} />
        </SubCard>
      </PanelSection>

      <PanelSection title="Footer" description="At the bottom of every page." page="/#site-footer">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Column 1 title" value={t.home_footer_explore_title} onChange={setText("home_footer_explore_title")} />
          <TextField label="Column 2 title" value={t.home_footer_help_title} onChange={setText("home_footer_help_title")} />
          <TextField label="Column 3 title" value={t.home_footer_follow_title} onChange={setText("home_footer_follow_title")} />
          <TextField label="Column 4 title" value={t.home_footer_chat_title} onChange={setText("home_footer_chat_title")} />
        </div>
        <SubCard title="Chat button">
          <TextField label="Text" value={t.home_footer_chat_label} onChange={setText("home_footer_chat_label")} />
          <TextField label="Link" type="url" value={t.home_footer_chat_url} onChange={setText("home_footer_chat_url")} placeholder="https://m.me/…" />
        </SubCard>
        <ImageField
          label="Logo"
          value={sections.footerLogo}
          fallback={footerLogo.src}
          fit="contain"
          uploading={!!uploading.footerLogo}
          onUpload={editor.uploadSectionImage("footerLogo")}
          onRemove={editor.clearSectionImage("footerLogo")}
          hint="A wide logo on a clear background works best."
        />
        <TextField label="Copyright line" value={t.home_footer_copyright} onChange={setText("home_footer_copyright")} />
        <ElsewhereNote to="/contact-info" screen="Contact Us">
          The social media links in the footer come from the Contact Us screen.
        </ElsewhereNote>
      </PanelSection>

      <PanelSection title="Not shown on the site" description="The current website doesn't show these two, but they're still saved with the homepage, so they can't be empty.">
        <TextField label="About subtitle" value={content.home_about_subtitle} onChange={set("home_about_subtitle")} rows={2} />
        <ImageField label="About photo" value={content.home_about_image} uploading={!!uploading.home_about_image} onUpload={uploadTo("home_about_image")} onRemove={() => set("home_about_image")("")} />
      </PanelSection>
    </CmsEditor>
  );
}

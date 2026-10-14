"use client";

import CategoryPanel from "../../components/admin/CategoryPanel";
import CmsEditor from "../../components/admin/cms/CmsEditor";
import { ItemsNote, LinkField, PanelSection, SaveBar, SubCard, TextField } from "../../components/admin/cms/fields";
import NailServiceDropdown from "../../components/admin/NailServiceDropdown";
import { LoadingBar } from "@/components/atoms";
import { useServicesEditor } from "../../hooks/admin/useServicesEditor";
import { SERVICES_PREVIEW_PAGES } from "../../lib/admin/cmsPages";
import { SITE_LINK_OPTIONS } from "../../lib/homeSections";

// The Services page's words, the categories and every service, edited beside a live preview. Its
// state and saving are in hooks/admin/useServicesEditor.
export default function NailServices() {
  const editor = useServicesEditor();
  const { words, setWord, services, categories } = editor;

  if (editor.isLoading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading services" />
      </div>
    );
  }

  return (
    <CmsEditor
      title="Services"
      pages={SERVICES_PREVIEW_PAGES}
      drafts={words ? { home: words } : undefined}
      refreshKey={editor.refreshKey}
      header={
        <>
          {words && <SaveBar dirty={editor.wordsDirty} saving={editor.savingWords} onSave={editor.saveWords} onDiscard={editor.discardWords} />}
          <ItemsNote>Save is for the page heading and the banner. Each service and category saves on its own; the preview updates after each save.</ItemsNote>
        </>
      }
    >
      {words && (
        <PanelSection title="Page heading" description="The title at the top of the Services page and the line under it." page="/services">
          <TextField label="Heading" value={words.home_services_title} onChange={setWord("home_services_title")} />
          <TextField label="Subtitle" value={words.home_services_subtitle} onChange={setWord("home_services_subtitle")} rows={3} />
        </PanelSection>
      )}

      <PanelSection title="Categories" description="The filter chips on the Services page, and each category's add-ons.">
        <CategoryPanel categories={categories} tokenFetcher={editor.getToken} clerkId={editor.clerkId} onChanged={editor.categoriesChanged} />
      </PanelSection>

      <PanelSection
        title="Services"
        description="Each service's name, category, price (one price, or master and junior prices) and options, how long it takes, its description and photos. Open one to edit it, or add a new service at the bottom."
        page="/services"
        aside={services.length}
      >
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <NailServiceDropdown
              key={service.id}
              service={service}
              categories={categories}
              tokenFetcher={editor.getToken}
              clerkId={editor.clerkId}
              onServiceUpdated={editor.onServiceUpdated}
              onServiceDeleted={editor.onServiceDeleted}
            />
          ))}

          <NailServiceDropdown mode="create" categories={categories} tokenFetcher={editor.getToken} clerkId={editor.clerkId} onServiceCreated={editor.onServiceCreated} />
        </div>
      </PanelSection>

      {words && (
        <PanelSection title="Bottom banner" description="The last call to action on the Services page." page="/services#services-banner">
          <TextField label="Heading" value={words.home_services_cta_title} onChange={setWord("home_services_cta_title")} rows={2} />
          <TextField label="Paragraph" value={words.home_services_cta_text} onChange={setWord("home_services_cta_text")} rows={3} />
          <SubCard title="Main button">
            <TextField label="Text" value={words.home_services_cta_primary_label} onChange={setWord("home_services_cta_primary_label")} />
            <LinkField label="Opens" value={words.home_services_cta_primary_link} pages={SITE_LINK_OPTIONS} onChange={setWord("home_services_cta_primary_link")} />
          </SubCard>
          <SubCard title="Second button">
            <TextField label="Text" value={words.home_services_cta_secondary_label} onChange={setWord("home_services_cta_secondary_label")} />
            <LinkField label="Opens" value={words.home_services_cta_secondary_link} pages={SITE_LINK_OPTIONS} onChange={setWord("home_services_cta_secondary_link")} />
          </SubCard>
        </PanelSection>
      )}
    </CmsEditor>
  );
}

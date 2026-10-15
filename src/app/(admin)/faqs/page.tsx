"use client";

import CmsEditor from "@/components/features/admin/cms/CmsEditor";
import { ItemsNote, LinkField, PanelSection, SaveBar, SubCard, TextField } from "@/components/features/admin/cms/fields";
import Dropdown from "@/components/features/admin/cms/FAQDropdown";
import { SortableList } from "@/components/molecules";
import { LoadingBar } from "@/components/atoms";
import { useFaqsEditor } from "@/hooks/admin/useFaqsEditor";
import { FAQ_PREVIEW_PAGES } from "@/lib/admin/cmsPages";
import { SITE_LINK_OPTIONS } from "@/lib/homeSections";

// The FAQs: the FAQ page's words and every question, edited beside a live preview. Its state and
// saving are in hooks/admin/useFaqsEditor.
export default function FAQs() {
  const { list, page, getToken, clerkId, newFaq } = useFaqsEditor();
  const { words } = page;
  const faqs = list.items;

  if (list.loading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading FAQs" />
      </div>
    );
  }

  return (
    <CmsEditor
      title="FAQs"
      pages={FAQ_PREVIEW_PAGES}
      drafts={words ? { home: words } : undefined}
      refreshKey={list.refreshKey}
      header={
        <>
          {words && <SaveBar dirty={page.dirty} saving={page.saving} onSave={page.saveWords} onDiscard={page.discard} />}
          <ItemsNote>
            Save is for the FAQ page&apos;s words. The questions show on the FAQ page and in the home page&apos;s FAQ section; each saves on its own, and you can drag the handles to change the order.
          </ItemsNote>
        </>
      }
    >
      {words && (
        <PanelSection title="FAQ page heading" description="The title at the top of the FAQ page and the line under it." page="/faq">
          <TextField label="Heading" value={words.home_faq_page_title} onChange={page.setWord("home_faq_page_title")} />
          <TextField label="Intro" value={words.home_faq_page_intro} onChange={page.setWord("home_faq_page_intro")} rows={3} />
        </PanelSection>
      )}

      <PanelSection
        title="Questions"
        description="Each question and its answer, in the order they're shown on the FAQ page and the home page. Open one to edit it, drag the handle to move it, or add a new question at the bottom."
        page="/faq"
        aside={faqs.length}
      >
        {list.error ? (
          <p className="text-sm text-gray-red">{list.error}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {faqs.length === 0 ? (
              <p className="text-sm text-gray-red/70">No FAQs yet.</p>
            ) : (
              <SortableList
                items={faqs}
                getItemId={(item) => item.id}
                onReorder={list.reorder}
                className="flex flex-col gap-3"
                renderItem={(faq, { dragHandleProps, isDragging }) => (
                  <Dropdown
                    faq={faq}
                    onFaqUpdated={list.onUpdated}
                    onFaqDeleted={list.onDeleted}
                    dragHandleProps={dragHandleProps}
                    isDragging={isDragging}
                    tokenFetcher={getToken}
                    clerkId={clerkId}
                  />
                )}
                renderOverlay={(faq) => <Dropdown faq={faq} isDragOverlay />}
              />
            )}

            <Dropdown mode="create" faq={newFaq} onFaqCreated={list.onCreated} tokenFetcher={getToken} clerkId={clerkId} />
          </div>
        )}
      </PanelSection>

      {words && (
        <PanelSection title="Bottom banner" description="The last call to action on the FAQ page." page="/faq#faq-banner">
          <TextField label="Heading" value={words.home_faq_cta_title} onChange={page.setWord("home_faq_cta_title")} rows={2} />
          <TextField label="Paragraph" value={words.home_faq_cta_text} onChange={page.setWord("home_faq_cta_text")} rows={2} />
          <SubCard title="Main button">
            <TextField label="Text" value={words.home_faq_cta_primary_label} onChange={page.setWord("home_faq_cta_primary_label")} />
            <LinkField label="Opens" value={words.home_faq_cta_primary_link} pages={SITE_LINK_OPTIONS} onChange={page.setWord("home_faq_cta_primary_link")} />
          </SubCard>
          <SubCard title="Second button">
            <TextField label="Text" value={words.home_faq_cta_secondary_label} onChange={page.setWord("home_faq_cta_secondary_label")} />
            <LinkField label="Opens" value={words.home_faq_cta_secondary_link} pages={SITE_LINK_OPTIONS} onChange={page.setWord("home_faq_cta_secondary_link")} />
          </SubCard>
        </PanelSection>
      )}
    </CmsEditor>
  );
}

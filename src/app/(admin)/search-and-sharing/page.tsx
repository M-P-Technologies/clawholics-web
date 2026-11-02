"use client";

import AdminShell from "@/components/features/admin/shell/AdminShell";
import SearchPreview from "@/components/features/admin/cms/SearchPreview";
import { ImageField, PanelSection, SaveBar, TextField } from "@/components/features/admin/cms/fields";
import { SectionSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { Button } from "@/components/atoms";
import { useSeoEditor } from "@/hooks/admin/useSeoEditor";
import { DESCRIPTION_ADVICE, SEO_PAGE_LABELS, TITLE_ADVICE, shownAddress, shownTitle } from "@/lib/admin/seoEditor";
import { OG_IMAGE, SEO_PAGE_KEYS, seoKey } from "@/lib/seo";

// Admin > Search & Sharing: the title and description search engines show for each public page, and
// the picture link previews (WhatsApp, Messenger, social posts) show. Its state and saving are in
// hooks/admin/useSeoEditor.
export default function SearchAndSharing() {
  const editor = useSeoEditor();
  const { form, set } = editor;

  return (
    <AdminShell title="Search & Sharing">
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-crimson-light/40 bg-milk shadow-petal">
          {editor.isLoading ? (
            <SectionSkeleton label="Loading search and sharing" lines={6} className="p-6" />
          ) : editor.loadFailed ? (
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="font-bold text-gray-red">We couldn&apos;t load the search and sharing text.</p>
              <Button type="button" variant="secondary" onClick={editor.retry}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <SaveBar dirty={editor.dirty} saving={editor.isSaving} busy={editor.isUploading} onSave={editor.save} onDiscard={editor.discard} />

              <PanelSection title="Link preview picture" description="The picture shown when a page of the site is shared in a message or a post. A service or artist page shows its own photo instead.">
                <ImageField
                  label="Picture"
                  value={editor.image}
                  fallback={OG_IMAGE.url}
                  uploading={editor.isUploading}
                  onUpload={editor.uploadImage}
                  onRemove={editor.removeImage}
                  hint="A wide picture about twice as wide as it is tall (1200 x 630) works best."
                />
              </PanelSection>

              {SEO_PAGE_KEYS.map((page) => {
                const title = form[seoKey(page, "title")] ?? "";
                const description = form[seoKey(page, "description")] ?? "";
                return (
                  <PanelSection key={page} title={SEO_PAGE_LABELS[page]} description="What search results show for this page.">
                    <SearchPreview title={shownTitle(page, title)} address={shownAddress(page)} description={description} />
                    <TextField
                      label="Title"
                      value={title}
                      onChange={set(seoKey(page, "title"))}
                      hint={`${title.length} characters. Search results show about ${TITLE_ADVICE}. "| Clawholics by Max" is added after it.`}
                    />
                    <TextField
                      label="Description"
                      value={description}
                      onChange={set(seoKey(page, "description"))}
                      rows={3}
                      hint={`${description.length} characters. Search results show about ${DESCRIPTION_ADVICE}.`}
                    />
                  </PanelSection>
                );
              })}
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

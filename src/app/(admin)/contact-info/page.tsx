"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import CmsEditor from "@/components/features/admin/cms/CmsEditor";
import { ElsewhereNote, IconPicker, PanelSection, SaveBar, SubCard, TextField } from "@/components/features/admin/cms/fields";
import { Button } from "@/components/atoms";
import { CmsEditorSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { useContactEditor } from "@/hooks/admin/useContactEditor";
import { CONTACT_BUSINESS_FIELDS, CONTACT_PREVIEW_PAGES } from "@/lib/admin/contactEditor";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS } from "@/lib/socialLinks";

// The Contact page's words, the phone and email, and the social media links (shown on the
// Contact page and in the footer of every page), edited beside a live preview. The address and
// map link come from About Us. Its state and saving are in hooks/admin/useContactEditor.
export default function ContactUs() {
  const editor = useContactEditor();
  const { values, set, links, setLink, moveLink, error } = editor;

  if (editor.isLoading) return <CmsEditorSkeleton title="Contact Us" />;

  return (
    <CmsEditor
      title="Contact Us"
      pages={CONTACT_PREVIEW_PAGES}
      drafts={{ home: editor.draft }}
      refreshKey={editor.refreshKey}
      header={error ? undefined : <SaveBar dirty={editor.dirty} saving={editor.isSaving} onSave={editor.save} onDiscard={editor.discard} />}
    >
      {error ? (
        <div className="flex flex-col items-start gap-3 px-6 py-6 text-sm text-gray-red">
          {error}
          <Button type="button" onClick={editor.retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <PanelSection title="Contact page" description="The line under the Contact heading." page="/contact">
            <TextField label="Subheading" value={values.contact_subtitle} onChange={set("contact_subtitle")} rows={3} />
          </PanelSection>

          <PanelSection title="Business details" description="On the Contact page." page="/contact">
            {CONTACT_BUSINESS_FIELDS.map((field) => (
              <TextField key={field.key} label={field.label} type={field.type} value={values[field.key]} onChange={set(field.key)} />
            ))}
            <ElsewhereNote to="/about-us" screen="About Us">
              The address and map link come from the About Us screen, where they&apos;re also shown on the About page and in the home page&apos;s Quick contact. Whatever you change there shows here too.
            </ElsewhereNote>
          </PanelSection>

          <PanelSection title="Social media" description="On the Contact page and in the footer of every page, in this order." page="/contact" aside={`${links.length}/${MAX_SOCIAL_LINKS}`}>
            {editor.linkCards.map(({ link, index, label, isEmail }) => (
              <SubCard key={index} title={label}>
                <IconPicker label="Platform" value={link.platform} icons={SOCIAL_PLATFORMS} onChange={(platform) => setLink(index, { platform })} />
                <TextField label={isEmail ? "Name to show" : "Username"} value={link.name} onChange={(name) => setLink(index, { name })} />
                <TextField
                  label={isEmail ? "Email address" : "Link"}
                  type={isEmail ? "email" : "url"}
                  value={link.url}
                  onChange={(url) => setLink(index, { url })}
                  placeholder={isEmail ? "hello@example.com" : "https://…"}
                />
                <div className="flex flex-wrap justify-end gap-1">
                  <Button type="button" variant="bare" aria-label={`Move the ${label} link up`} disabled={index === 0} onClick={() => moveLink(index, -1)} className="rounded-md p-1.5 text-gray-red hover:bg-crimson-light/30 disabled:opacity-30">
                    <ArrowUp size={16} aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="bare" aria-label={`Move the ${label} link down`} disabled={index === links.length - 1} onClick={() => moveLink(index, 1)} className="rounded-md p-1.5 text-gray-red hover:bg-crimson-light/30 disabled:opacity-30">
                    <ArrowDown size={16} aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="bare" onClick={() => editor.removeLink(index)} className="gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold text-danger-ink hover:bg-danger/10">
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </SubCard>
            ))}
            {links.length === 0 && <p className="text-[13px] text-gray-red">No social media links yet.</p>}
            <Button fullWidth type="button" variant="secondary" disabled={links.length >= MAX_SOCIAL_LINKS} onClick={editor.addLink}>
              <Plus size={16} aria-hidden="true" />
              Add a social link
            </Button>
          </PanelSection>
        </>
      )}
    </CmsEditor>
  );
}

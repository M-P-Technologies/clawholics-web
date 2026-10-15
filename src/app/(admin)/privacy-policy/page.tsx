"use client";

import { RotateCcw } from "lucide-react";
import CmsEditor, { CmsLoadError } from "@/components/features/admin/cms/CmsEditor";
import { PanelSection, SaveBar } from "@/components/features/admin/cms/fields";
import RichTextField from "@/components/features/admin/cms/RichTextField";
import { Button } from "@/components/atoms";
import { CmsEditorSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { usePrivacyEditor } from "@/hooks/admin/usePrivacyEditor";
import { PRIVACY_KEY, PRIVACY_PREVIEW_PAGES } from "@/lib/admin/cmsPages";

// The privacy policy page (/privacy), edited as formatted text beside a live preview. Until it's
// saved here the site shows the original, generated policy. Its state and saving are in
// hooks/admin/usePrivacyEditor.
export default function PrivacyPolicy() {
  const editor = usePrivacyEditor();

  if (editor.isLoading) return <CmsEditorSkeleton title="Privacy Policy" />;

  if (editor.loadFailed) return <CmsLoadError title="Privacy Policy" what="the privacy policy" onRetry={editor.retry} />;

  return (
    <CmsEditor
      title="Privacy Policy"
      pages={PRIVACY_PREVIEW_PAGES}
      drafts={{ legal: { [PRIVACY_KEY]: editor.html } }}
      refreshKey={editor.refreshKey}
      header={<SaveBar dirty={editor.dirty} saving={editor.isSaving} onSave={editor.save} onDiscard={editor.discard} />}
    >
      <PanelSection
        title="Policy"
        description="The whole privacy policy page. Select words to make them a heading, bold or a link; the preview shows the page as you type."
        page="/privacy"
        aside={editor.isOriginal ? "Original" : undefined}
      >
        <RichTextField label="Privacy policy" initialHtml={editor.html} resetKey={editor.resetKey} onChange={editor.setHtml} />
        {editor.differsFromOriginal && (
          <Button type="button" variant="bare" onClick={editor.restoreOriginal} className="gap-1.5 self-start rounded-md px-3 py-1.5 text-[13px] font-bold text-gray-red hover:bg-crimson-light/30">
            <RotateCcw size={14} aria-hidden="true" />
            Put back the original
          </Button>
        )}
        <p className="text-[12px] leading-snug text-gray-red">Remember to update the &ldquo;Last updated&rdquo; date near the top when the policy changes.</p>
      </PanelSection>
    </CmsEditor>
  );
}

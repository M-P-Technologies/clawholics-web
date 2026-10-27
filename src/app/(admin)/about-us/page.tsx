"use client";

import CarouselEditor, { MAX_CAROUSEL_IMAGES } from "@/components/features/admin/cms/CarouselEditor";
import CmsEditor, { CmsLoadError } from "@/components/features/admin/cms/CmsEditor";
import { ImageField, PanelSection, SaveBar, TextField } from "@/components/features/admin/cms/fields";
import { CmsEditorSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { useArtistWorkPhotos } from "@/hooks/admin/useArtistWorkPhotos";
import { useAboutEditor } from "@/hooks/admin/useAboutEditor";
import { ABOUT_DAYS, ABOUT_PREVIEW_PAGES } from "@/lib/admin/aboutEditor";

// The About page's story, photo, studio gallery, location and opening hours, edited beside a live
// preview. Its state and saving are in hooks/admin/useAboutEditor.
export default function AboutUs() {
  const editor = useAboutEditor();
  const workPhotos = useArtistWorkPhotos();
  const { content, set, gallery } = editor;

  if (editor.isLoading) return <CmsEditorSkeleton title="About Us" />;

  if (editor.loadFailed) return <CmsLoadError title="About Us" what="About us" onRetry={editor.retry} />;

  return (
    <CmsEditor
      title="About Us"
      pages={ABOUT_PREVIEW_PAGES}
      drafts={{ about: { ...content }, carousel: gallery }}
      refreshKey={editor.refreshKey}
      header={<SaveBar dirty={editor.dirty} saving={editor.isSaving} busy={editor.isUploading} onSave={editor.save} onDiscard={editor.discard} />}
    >
      <PanelSection title="Story" description="The salon's story, at the top of the About page." page="/about">
        <TextField label="Description" value={content.about_description} onChange={set("about_description")} rows={8} />
        <ImageField label="Photo" value={content.about_image} uploading={editor.isUploading} onUpload={editor.uploadPhoto} onRemove={() => set("about_image")("")} />
      </PanelSection>

      <PanelSection title="Studio gallery" description="The photos of the studio's work on the About page, chosen from the artists' work (the photos from completed visits). Drag to change the order." page="/about" aside={`${gallery.length}/${MAX_CAROUSEL_IMAGES}`}>
        <CarouselEditor photos={gallery} onChange={editor.setGallery} choices={workPhotos.photos} choicesLoading={workPhotos.isLoading} />
      </PanelSection>

      <div className="mx-3 mt-6 rounded-xl bg-crimson-light/20 p-3 text-[13px] leading-snug text-gray-red sm:mx-6">
        The address and map link also show on the Contact page and when booking, and the address, map, opening hours and Good to know list in the home page&apos;s Quick contact. Whatever you change here shows there too.
      </div>

      <PanelSection title="Location" description="Where the salon is, and the map link visitors open. Also on the home page." page="/about">
        <TextField label="Address" value={content.about_location} onChange={set("about_location")} rows={2} />
        <TextField label="Map link" type="url" value={content.about_location_url} onChange={set("about_location_url")} placeholder="https://maps.google.com/…" />
      </PanelSection>

      <PanelSection title="Opening hours" description="One line per day, as it should read, e.g. “Monday 10:00 AM – 8:00 PM”. The pages show the hours without the day name." page="/about">
        {ABOUT_DAYS.map((day) => (
          <TextField key={day} label={day} value={content[`about_business_hours_${day}`]} onChange={set(`about_business_hours_${day}`)} />
        ))}
      </PanelSection>

      <PanelSection title="Good to know" description="The checklist in the home page's Quick contact. One item per line." page="/#quick-contact">
        <TextField label="Items" value={content.about_good_to_know ?? ""} onChange={set("about_good_to_know")} rows={5} />
      </PanelSection>
    </CmsEditor>
  );
}

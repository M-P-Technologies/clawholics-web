"use client";

import CmsEditor from "@/components/features/admin/cms/CmsEditor";
import { ItemsNote, PanelSection, SaveBar, TextField } from "@/components/features/admin/cms/fields";
import ArtistEditor from "@/components/features/admin/catalog/ArtistEditor";
import { CmsEditorSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { useArtistsEditor } from "@/hooks/admin/useArtistsEditor";
import { ARTISTS_PREVIEW_PAGES } from "@/lib/admin/cmsPages";

// The Artists page's words and every artist, edited beside a live preview. Its state and saving
// are in hooks/admin/useArtistsEditor.
export default function NailArtists() {
  const editor = useArtistsEditor();
  const { words, setWord, nailists } = editor;

  if (editor.isLoading) return <CmsEditorSkeleton title="Artists" />;

  return (
    <CmsEditor
      title="Artists"
      pages={ARTISTS_PREVIEW_PAGES}
      drafts={words ? { team: words } : undefined}
      refreshKey={editor.refreshKey}
      header={
        <>
          {words && <SaveBar dirty={editor.wordsDirty} saving={editor.savingWords} onSave={editor.saveWords} onDiscard={editor.discardWords} />}
          <ItemsNote>
            Save is for the page&apos;s words. The artists show on the Artists page and in the home page&apos;s Artist spotlight, so whatever you change here shows in both; each artist saves on its own.
          </ItemsNote>
        </>
      }
    >
      {words && (
        <PanelSection title="Page words" description="The heading and intro at the top of the Artists page, and the title of the photo strip of their work." page="/artists">
          <TextField label="Heading" value={words.team_title} onChange={setWord("team_title")} />
          <TextField label="Intro" value={words.team_description} onChange={setWord("team_description")} rows={4} />
          <TextField label="Photo strip title" value={words.team_art_title} onChange={setWord("team_art_title")} />
        </PanelSection>
      )}

      <PanelSection
        title="Artists"
        description="Each artist's name, level (master or junior), specialty, photo and bio, the services they offer, their time slots and days off, and photos of their work. Open one to edit it, or add a new artist at the bottom."
        page="/artists"
        aside={nailists.length}
      >
        <div className="flex flex-col gap-3">
          {nailists.map((nailist) => (
            <ArtistEditor
              key={nailist.id}
              nailist={nailist}
              tokenFetcher={editor.getToken}
              clerkId={editor.clerkId}
              onNailistUpdated={editor.onNailistUpdated}
              onGalleryChanged={editor.changed}
              onNailistDeleted={editor.onNailistDeleted}
            />
          ))}

          <ArtistEditor mode="create" tokenFetcher={editor.getToken} clerkId={editor.clerkId} onNailistCreated={editor.onNailistCreated} />
        </div>
      </PanelSection>
    </CmsEditor>
  );
}

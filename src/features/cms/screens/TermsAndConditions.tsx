"use client";

import CmsEditor from "../components/CmsEditor";
import { ItemsNote, PanelSection } from "../components/fields";
import SortableList from "../components/SortableList";
import TACDropdown from "../components/TACDropdown";
import { useTermsEditor } from "../hooks/useTermsEditor";
import { TERMS_PREVIEW_PAGES } from "../lib/cmsPages";
import { CmsEditorSkeleton } from "../../../components/shared/skeletons";

// The Terms & Conditions sections, edited beside a live preview. Its state and saving are in
// hooks/useTermsEditor.
export default function TermsAndConditions() {
  const { list, getToken, clerkId } = useTermsEditor();
  const tacs = list.items;

  if (list.loading) return <CmsEditorSkeleton title="Terms & Conditions" />;

  return (
    <CmsEditor
      title="Terms & Conditions"
      pages={TERMS_PREVIEW_PAGES}
      refreshKey={list.refreshKey}
      header={<ItemsNote>Each section saves on its own. Drag the handles to change the order.</ItemsNote>}
    >
      <PanelSection
        title="Sections"
        description="Each section's heading and text, in the order they're shown on the Terms & Conditions page. Open one to edit it, drag the handle to move it, or add a new section at the bottom."
        page="/terms"
        aside={tacs.length}
      >
        {list.error ? (
          <p className="text-sm text-gray-red">{list.error}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tacs.length === 0 ? (
              <p className="text-sm text-gray-red/70">No sections yet.</p>
            ) : (
              <SortableList
                items={tacs}
                getItemId={(item) => item.id}
                onReorder={list.reorder}
                className="flex flex-col gap-3"
                renderItem={(tac, { dragHandleProps, isDragging }) => (
                  <TACDropdown
                    tac={tac}
                    onTacUpdated={list.onUpdated}
                    onTacDeleted={list.onDeleted}
                    dragHandleProps={dragHandleProps}
                    isDragging={isDragging}
                    tokenFetcher={getToken}
                    clerkId={clerkId}
                  />
                )}
                renderOverlay={(tac) => <TACDropdown tac={tac} isDragOverlay />}
              />
            )}

            <TACDropdown mode="create" tac={{ id: 0, section: "", content: "", display_order: tacs.length + 1 }} onTacCreated={list.onCreated} tokenFetcher={getToken} clerkId={clerkId} />
          </div>
        )}
      </PanelSection>
    </CmsEditor>
  );
}

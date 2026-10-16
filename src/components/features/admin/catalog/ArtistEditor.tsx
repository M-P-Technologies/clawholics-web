import { ChevronDown as DropdownIcon, Plus as PlusIcon } from "lucide-react";
import React from "react";

import NailArtistGallery from "@/components/features/admin/catalog/NailArtistGallery";
import ArtistDetailsFields from "./ArtistDetailsFields";
import ArtistPhotoField from "./ArtistPhotoField";
import ArtistServicesPicker from "./ArtistServicesPicker";
import DayOffCard from "./DayOffCard";
import TimeSlotCard from "./TimeSlotCard";
import { useArtistEditor, type ArtistEditorProps } from "@/hooks/admin/useArtistEditor";
import { EditActions } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { ConfirmDialog, ImagePreviewDialog } from "@/components/organisms";

// One artist's card in the Nail Artists editor, or the Add Artist card (mode "create"): the
// title opens it; the fields, day offs, time slots and gallery are edited and saved together.
const ArtistEditor: React.FC<ArtistEditorProps> = (props) => {
  const { nailist, onGalleryChanged, tokenFetcher, clerkId } = props;
  const editor = useArtistEditor(props);
  const { isCreateMode, isOpen, isEditing, isSaving, isDeleting, isUploading } = editor;
  const locked = !isEditing || isSaving || isDeleting;

  return (
    <>
      <div className="flex flex-col w-full rounded-xl border border-crimson-light/50 bg-milk px-3 py-3">
        <Button
          variant="bare"
          type="button"
          onClick={() => editor.setIsOpen((prevState) => !prevState)}
          aria-expanded={isOpen}
          className="flex items-center justify-between w-full gap-3 sm:gap-3 text-left min-h-8.75"
        >
          <span className="block min-w-0 font-bold text-base truncate text-gray-red">
            {editor.title || "Untitled Artist"}
          </span>

          {isCreateMode ? (
            <PlusIcon
              size={20} className={`shrink-0 mr-0.75 transition-transform duration-300 ${
                isOpen ? "rotate-45" : ""
              }`}
            />
          ) : (
            <DropdownIcon
              size={22} className={`text-gray-red shrink-0 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </Button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? "max-h-[2600px] opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-3">
            <ArtistDetailsFields
              isEditing={isEditing}
              name={editor.name}
              position={editor.position}
              specialty={editor.specialty}
              bio={editor.bio}
              onNameChange={editor.setName}
              onPositionChange={editor.setPosition}
              onSpecialtyChange={editor.setSpecialty}
              onBioChange={editor.setBio}
              services={
                <ArtistServicesPicker
                  services={editor.availableServices}
                  selectedIds={editor.selectedServiceIds}
                  disabled={locked}
                  onToggle={editor.toggleService}
                />
              }
            />

            <ArtistPhotoField
              image={editor.image}
              isEditing={isEditing}
              isUploading={isUploading}
              onPreview={editor.setPreviewImageUrl}
              onRemove={() => editor.setImage("")}
              onUpload={editor.uploadPhoto}
            />

            {!isCreateMode && (
              <DayOffCard
                nailistId={nailist?.id}
                disabled={locked}
                regularDays={editor.regularDays}
                customDates={editor.customDates}
                setRegularDays={editor.setRegularDays}
                setCustomDates={editor.setCustomDates}
                onDayOffsLoaded={editor.handleDayOffsLoaded}
              />
            )}

            {!isCreateMode && (
              <TimeSlotCard
                nailistId={nailist?.id}
                disabled={locked}
                timeSlots={editor.timeSlots}
                setTimeSlots={editor.setTimeSlots}
                onTimeSlotsLoaded={editor.handleTimeSlotsLoaded}
              />
            )}

            <NailArtistGallery
              nailistId={isCreateMode ? null : (nailist?.id ?? null)}
              isEditing={isEditing}
              tokenFetcher={tokenFetcher}
              clerkId={clerkId}
              onPreview={editor.setPreviewImageUrl}
              onChanged={onGalleryChanged}
            />

            <EditActions
              isEditing={isEditing}
              isCreateMode={isCreateMode}
              isSaving={isSaving}
              busy={isUploading}
              onEdit={() => editor.setIsEditing(true)}
              onCancel={editor.handleCancel}
              onSave={editor.handleSave}
              onDelete={() => editor.setIsDeleteModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {!isCreateMode && (
        <ConfirmDialog
          open={editor.isDeleteModalOpen}
          title="Delete artist?"
          confirmLabel="Delete artist"
          loadingLabel="Deleting..."
          loading={isDeleting}
          onClose={() => editor.setIsDeleteModalOpen(false)}
          onConfirm={editor.handleDelete}
        >
          Are you sure you want to delete this artist? This action cannot be undone.
        </ConfirmDialog>
      )}

      <ImagePreviewDialog
        imageUrl={editor.previewImageUrl}
        onClose={() => editor.setPreviewImageUrl(null)}
      />
    </>
  );
};

export default ArtistEditor;

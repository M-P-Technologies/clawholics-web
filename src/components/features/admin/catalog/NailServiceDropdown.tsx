import { ChevronDown as DropdownIcon, Plus as PlusIcon, Star as StarIcon, X } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "@/lib/adminQueries";
import { useFillForm } from "@/hooks/admin/useFillForm";
import { pickMainPhoto } from "@/utils/mainPhoto";

import {
  addServiceGalleryImage,
  createService,
  deleteService,
  deleteServiceGalleryImage,
  fetchServiceGallery,
  updateService,
  type NailService,
  type ServiceGalleryImage,
} from "@/services/serviceService";
import type { ServiceCategory } from "@/services/catalogService";
import ServicePricingFields, {
  draftFromService,
  emptyDraft,
  payloadFromDraft,
  validateDraft,
  type PricingDraft,
} from "@/components/features/admin/catalog/ServicePricingFields";

import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "@/services/uploadService";
import { DragHandle, useToast, EditActions, SectionHeader } from "@/components/molecules";
import { itemName, upperFirst } from "@/lib/itemName";
import type { SortableHandleProps } from "@/components/molecules";
import { Button, IconButton } from "@/components/atoms";
import { DropArea } from "@/components/features/admin/cms/fields";
import { ConfirmDialog, ImagePreviewDialog } from "@/components/organisms";

type NailServiceDropdownProps = {
  service?: NailService;
  mode?: "edit" | "create";
  onServiceUpdated?: (updatedService: NailService) => void | Promise<void>;
  onServiceCreated?: (createdService: NailService) => void | Promise<void>;
  onServiceDeleted?: (serviceId: number) => void;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  categories: ServiceCategory[];
  /** From a SortableList: the handle that drags this row, and whether it is being dragged */
  dragHandleProps?: SortableHandleProps;
  isDragging?: boolean;
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isEditing: boolean;
};

const MAX_IMAGES = 10;

const InputField = ({ label, value, onChange, isEditing }: InputFieldProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.max(
      textareaRef.current.scrollHeight,
      32
    )}px`;
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-red">{label}</h3>
      </div>


      <textarea
        ref={textareaRef}
        disabled={!isEditing}
        value={value}
        onChange={(e) => {
          onChange(e);
          e.currentTarget.style.height = "0px";
          e.currentTarget.style.height = `${Math.max(
            e.currentTarget.scrollHeight,
            32
          )}px`;
        }}
        className="w-full min-h-9.5 rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none resize-none overflow-hidden whitespace-pre-line focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
};

const NailServiceDropdown: React.FC<NailServiceDropdownProps> = ({
  service,
  mode = "edit",
  onServiceUpdated,
  onServiceCreated,
  onServiceDeleted,
  tokenFetcher,
  clerkId,
  categories,
  dragHandleProps,
  isDragging = false,
}) => {
  const toast = useToast();
  const uploadId = useId();
  const isCreateMode = mode === "create";

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [pricing, setPricing] = useState<PricingDraft>(() => draftFromService(service));
  const [originalPricing, setOriginalPricing] = useState<PricingDraft>(() => draftFromService(service));
  const [duration, setDuration] = useState(service?.duration ?? "");
  const [gallery, setGallery] = useState<ServiceGalleryImage[]>([]);
  // The photo that stands for the service on the site; null means "the first one"
  const [starredUrl, setStarredUrl] = useState<string | null>(service?.image ?? null);

  const [originalName, setOriginalName] = useState(service?.name ?? "");
  const [originalDescription, setOriginalDescription] = useState(
    service?.description ?? ""
  );
  const [originalDuration, setOriginalDuration] = useState(
    service?.duration ?? ""
  );
  const [originalGallery, setOriginalGallery] = useState<ServiceGalleryImage[]>(
    []
  );

  // The service's photos in order, cached per service. They're a draft until Save, so a refresh
  // from the server only replaces them while they aren't being edited.
  const queryClient = useQueryClient();
  const galleryQuery = {
    queryKey: [ADMIN, "services", service?.id ?? 0, "gallery"],
    queryFn: async () => [...(await fetchServiceGallery(service?.id ?? 0))].sort((a, b) => a.position - b.position),
  };
  // What messages call this service: its name as typed (or saved), or "this service" while it has none
  const who = itemName(name || service?.name || originalName, "this service");
  const loadedGallery = useQuery({ ...galleryQuery, enabled: !isCreateMode && !!service });
  const galleryShown = useFillForm(loadedGallery.data, isEditing, (data) => {
    setGallery(data);
    setOriginalGallery(data);
  });
  useEffect(() => {
    if (!loadedGallery.isError) return;
    console.error("Failed to fetch service gallery:", loadedGallery.error);
    toast.show("error", "Couldn't load the gallery", `We couldn't load the photos of ${who}. Please close and reopen it to try again.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedGallery.isError, loadedGallery.error]);

  useEffect(() => {
    if (!isCreateMode && service) {
      setName(service.name);
      setDescription(service.description);
      setDuration(service.duration);
      setPricing(draftFromService(service));
      setOriginalPricing(draftFromService(service));

      setOriginalName(service.name);
      setOriginalDescription(service.description);
      setOriginalDuration(service.duration);
    }
  }, [service, isCreateMode]);

  const resetCreateForm = () => {
    setName("");
    setDescription("");
    setDuration("");
    setGallery([]);
    setStarredUrl(null);
    setPricing(emptyDraft());
    setOriginalPricing(emptyDraft());

    setOriginalName("");
    setOriginalDescription("");
    setOriginalDuration("");
    setOriginalGallery([]);

    setIsOpen(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isCreateMode) {
      resetCreateForm();
      return;
    }

    setName(originalName);
    setDescription(originalDescription);
    setPricing(originalPricing);
    setDuration(originalDuration);
    setGallery(originalGallery);
    setStarredUrl(service?.image ?? null);
    setIsEditing(false);
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files);
    const remainingSlots = MAX_IMAGES - gallery.length;

    if (selectedFiles.length > remainingSlots) {
      toast.show("error", "Too many photos", `${upperFirst(who)} can have up to ${MAX_IMAGES} photos. Remove some before uploading more.`);
      return;
    }

    try {
      setIsUploading(true);

      const currentName = name;
      const token = tokenFetcher ? await tokenFetcher() : null;

      const uploadedImages = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const data = await uploadImage(file, "service-gallery", token, clerkId, PHOTO_UPLOAD_OPTIONS);
          return {
            id: Date.now() + index,
            service_id: service?.id ?? 0,
            image_url: data.imageUrl,
            position: gallery.length + index + 1,
          };
        })
      );

      setGallery((prev) => [...prev, ...uploadedImages]);
      setName((prevName) => prevName || currentName || service?.name || originalName);
    } catch (error) {
      console.error("Failed to upload service images:", error);
      toast.show("error", "Photos not uploaded", `We couldn't upload the photos for ${who}. Please check that they are image files and try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (image: ServiceGalleryImage) => {
    const token = tokenFetcher ? await tokenFetcher() : null;
    if (!isCreateMode && image.service_id !== 0) {
      try {
        await deleteServiceGalleryImage(image.id, token, clerkId);
      } catch (error) {
        console.error("Failed to delete service image:", error);
        toast.show("error", "Photo not removed", `We couldn't remove that photo from ${who}, so it is still in the gallery. Please try again.`);
        return;
      }
    }

    setGallery((prev) =>
      prev
        .filter((item) => item.id !== image.id)
        .map((item, index) => ({
          ...item,
          position: index + 1,
        }))
    );
  };

  const mainPhotoUrl = pickMainPhoto(gallery.map((image) => image.image_url), starredUrl);
  const isMain = (image: ServiceGalleryImage) => image.image_url === mainPhotoUrl;

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedDuration = duration.trim();

    const target = itemName(trimmedName, "this service");
    if (!trimmedName || !trimmedDescription || !trimmedDuration || gallery.length === 0) {
      toast.show("error", "Some fields are empty", `Please fill in every field${trimmedName ? ` for ${target}` : ""} before saving. Nothing was saved.`);
      return;
    }

    const pricingError = validateDraft(pricing);
    if (pricingError) {
      toast.show("error", `Check the pricing of ${target}`, `${pricingError} Nothing was saved.`);
      return;
    }

    try {
      setIsSaving(true);
      const token = tokenFetcher ? await tokenFetcher() : null;

      const mainImage = pickMainPhoto(gallery.map((image) => image.image_url), starredUrl)!;

      if (isCreateMode) {
        const createdService = await createService(
          {
            name: trimmedName,
            category_id: pricing.categoryId as number,
            description: trimmedDescription,
            duration: trimmedDuration,
            image: mainImage,
            ...payloadFromDraft(pricing),
          },
          token,
          clerkId
        );

        await Promise.all(
          gallery.map((image, index) =>
            addServiceGalleryImage(createdService.id, image.image_url, index + 1, token, clerkId)
          )
        );

        await onServiceCreated?.(createdService);
        resetCreateForm();
        toast.show("success", `${target} added`, `${upperFirst(target)} now appears on the Services page. Assign artists to it so clients can book it.`);
        return;
      }

      if (!service) return;

      const updatedService = await updateService(
        service.id,
        {
          name: trimmedName,
          category_id: pricing.categoryId as number,
          description: trimmedDescription,
          duration: trimmedDuration,
          image: mainImage,
          ...payloadFromDraft(pricing),
        },
        token,
        clerkId
      );

      const existingImageUrls = originalGallery.map((image) => image.image_url);
      const newImages = gallery.filter(
        (image) => !existingImageUrls.includes(image.image_url)
      );

      await Promise.all(
        newImages.map((image, index) =>
          addServiceGalleryImage(
            service.id,
            image.image_url,
            originalGallery.length + index + 1,
            token,
            clerkId
          )
        )
      );

      // Asked fresh, and kept as the cached copy
      const sortedGallery = await queryClient.fetchQuery({ ...galleryQuery, staleTime: 0 });
      galleryShown(sortedGallery);

      setName(updatedService.name);
      setDescription(updatedService.description);
      setDuration(updatedService.duration);
      setGallery(sortedGallery);
      setStarredUrl(updatedService.image ?? null);
      setPricing(draftFromService(updatedService));
      setOriginalPricing(draftFromService(updatedService));

      setOriginalName(updatedService.name);
      setOriginalDescription(updatedService.description);
      setOriginalDuration(updatedService.duration);
      setOriginalGallery(sortedGallery);

      setIsEditing(false);
      await onServiceUpdated?.(updatedService);
      toast.show("success", `${target} saved`, "Your changes are now live on the website. Appointments already booked keep the price they were booked at.");
    } catch (error) {
      console.error(
        `Failed to ${isCreateMode ? "create" : "save"} service:`,
        error
      );
      toast.show(
        "error",
        isCreateMode ? `${target} not created` : `${target} not saved`,
        error instanceof Error && error.message
          ? error.message
          : `We couldn't save ${target}, so the website is unchanged. Your edits are still on screen. Please try again.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    const target = itemName(service.name, "this service");

    try {
      setIsDeleting(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteService(service.id, token, clerkId);
      setIsDeleteModalOpen(false);
      onServiceDeleted?.(service.id);
      toast.show("success", `${target} deleted`, `${upperFirst(target)} was removed from the Services page and can no longer be booked.`);
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.show("error", `${target} not deleted`, `We couldn't delete ${target}, so it is still listed. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isCreateMode
  ? "Add Service"
  : name.trim() || service?.name || originalName;

  return (
    <>
      <div className={`flex flex-col w-full rounded-xl border border-crimson-light/50 bg-milk px-3 py-3 transition-opacity duration-200 ${isDragging ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {/* The drag handle sits beside the toggle, not inside it: a button can't hold a button */}
        <div className="flex min-h-8.75 items-center gap-3">
          {!isCreateMode && <DragHandle {...(dragHandleProps ?? {})} />}

          <Button
            variant="bare"
            type="button"
            onClick={() => setIsOpen((prevState) => !prevState)}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <span className="block min-w-0 font-bold text-base truncate text-gray-red">
              {title || "Untitled Service"}
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
        </div>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? "max-h-[3200px] opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-3">
            <InputField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isEditing={isEditing}
            />

            <InputField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              isEditing={isEditing}
            />

            <ServicePricingFields
              draft={pricing}
              onChange={setPricing}
              isEditing={isEditing}
              categories={categories}
            />

            <InputField
              label="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              isEditing={isEditing}
            />

            <div className="flex flex-col gap-1.5">
              <SectionHeader size="label" title={`Photos (${gallery.length}/${MAX_IMAGES})`} />
              {gallery.length > 0 && (
                <p className="mb-2 text-[13px] text-gray-red">The starred photo is the one shown for this service on the website.</p>
              )}

              <div className="flex flex-col gap-3">
                {gallery.map((image) => (
                  <div
                    key={image.id}
                    className="flex items-center justify-between w-full min-h-9 bg-milk rounded-md px-3 py-1 overflow-visible border border-crimson-light"
                  >
                    <Button
                      variant="bare"
                      type="button"
                      onClick={() => setPreviewImageUrl(image.image_url)}
                      className="min-w-0 flex-1 cursor-pointer text-left text-[13px] leading-none truncate text-gray-red hover:underline"
                    >
                      {image.image_url.split("/").pop()}
                    </Button>

                    <Button
                      variant="bare"
                      type="button"
                      aria-label={isMain(image) ? "Main photo of this service" : "Make this the main photo"}
                      aria-pressed={isMain(image)}
                      title={isMain(image) ? "Main photo: shown for this service on the website" : "Make this the main photo"}
                      disabled={!isEditing || isUploading}
                      onClick={() => setStarredUrl(image.image_url)}
                      className="flex items-center justify-center w-7 h-7 shrink-0 disabled:cursor-default disabled:opacity-100"
                    >
                      <StarIcon size={22} className={isMain(image) ? "fill-crimson text-crimson" : "text-crimson/40"} />
                    </Button>

                    {isEditing && (
                      <IconButton size="sm" icon={X} label="Remove photo" onClick={() => handleRemoveImage(image)} disabled={isUploading} />
                    )}
                  </div>
                ))}
              </div>

              {isEditing && gallery.length < MAX_IMAGES && (
                <div className="mt-3">
                  <DropArea
                    id={uploadId}
                    uploading={isUploading}
                    label="Add photos"
                    hint="PNG, JPG or WebP. Click, or drop them here."
                    onFiles={(files) => void handleUploadImages(files)}
                    input={
                      <input
                        id={uploadId}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        disabled={isUploading}
                        className="sr-only"
                        onChange={async (e) => {
                          await handleUploadImages(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    }
                  />
                </div>
              )}
            </div>

            <EditActions
              isEditing={isEditing}
              isCreateMode={isCreateMode}
              isSaving={isSaving}
              busy={isUploading}
              onEdit={() => setIsEditing(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              onDelete={() => setIsDeleteModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {!isCreateMode && (
        <ConfirmDialog
          open={isDeleteModalOpen}
          title="Delete service?"
          confirmLabel="Delete service"
          loadingLabel="Deleting..."
          loading={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        >
          Are you sure you want to delete <strong>{itemName(service?.name, "this service")}</strong>? This action cannot be undone.
        </ConfirmDialog>
      )}

      <ImagePreviewDialog
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
};

export default NailServiceDropdown;
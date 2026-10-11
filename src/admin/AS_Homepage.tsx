"use client";

import { Upload as UploadIcon, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import AS_SideBar from "../components/admin/AS_SideBar";
import AS_ImagePreviewModal from "../components/admin/AS_ImagePreviewModal";
import { LoadingBar } from "../components/ui/LoadingBar";

import {
  fetchHomeContent,
  updateHomeContent,
  type HomeCMSContent,
} from "../services/contentService";

import {
  fetchCarousel,
  updateCarousel,
  type CarouselItem,
} from "../services/carouselService";

import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../services/uploadService";
import { DEFAULT_HERO_IMAGE } from "../data/home";
import { useToast } from "../components/ui/ToastProvider";
import EditActions from "../components/admin/EditActions";
import Button from "../components/ui/Button";

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isEditing: boolean;
  isTextarea?: boolean;
};

const emptyHomeContent: HomeCMSContent = {
  home_title: "",
  home_services_subtitle: "",
  home_about_subtitle: "",
  home_about_image: "",
  home_hero_image: "",
};

const MAX_CAROUSEL_IMAGES = 10;

const CardTitle = ({ label }: { label: string }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] tracking-wide text-gray-red">{label}</h3>
      </div>

      <div className="w-full h-[1.5px] bg-crimson" />
    </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  isEditing,
  isTextarea = true,
}: InputFieldProps) => {
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
  }, [value, isTextarea]);

  return (
    <div className="flex flex-col gap-4 bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[17px] tracking-wide text-gray-red">{label}</h3>
      </div>

      <div className="w-full h-[1.5px] bg-crimson mb-2" />

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
        className="w-full min-h-[32px] mt-1 bg-transparent outline-none resize-none overflow-hidden text-[16px] text-gray-red whitespace-pre-line disabled:cursor-not-allowed"
      />
    </div>
  );
};

const getFileName = (url: string) => {
  return url.split("/").pop() || url;
};

type ImageFieldProps = {
  title: string;
  value: string;
  isEditing: boolean;
  isUploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onChange: (url: string) => void;
  onPreview: (url: string) => void;
};

// One photo: shows its file name (click to preview), and while editing lets you remove it or
// upload another.
const ImageField = ({ title, value, isEditing, isUploading, onUploadingChange, onChange, onPreview }: ImageFieldProps) => {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-4 bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
      <CardTitle label={title} />

      {value && (
        <div className="flex items-center justify-between w-full min-h-[36px] bg-light-orange rounded-md px-4 py-1 overflow-visible border border-crimson-light/80">
          <Button
            variant="bare"
            type="button"
            onClick={() => onPreview(value)}
            className="min-w-0 flex-1 cursor-pointer text-left text-[16px] leading-none truncate text-gray-red hover:underline"
          >
            {getFileName(value)}
          </Button>

          {isEditing && (
            <Button
              variant="bare"
              type="button"
              onClick={() => onChange("")}
              disabled={isUploading}
              className="flex items-center justify-center w-7 h-7 shrink-0"
            >
              <XIcon size={28} className="text-crimson" />
            </Button>
          )}
        </div>
      )}

      {isEditing && !value && (
        <label
          className={`flex flex-col items-center justify-center w-full ${
            !isUploading ? "cursor-pointer" : "cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
            <UploadIcon size={28} className="text-crimson" />
          </div>

          <p className="text-[13px] text-gray-red">
            {isUploading ? "Uploading photo..." : "Click here to upload a photo"}
          </p>

          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            disabled={isUploading}
            className="border border-crimson-light focus:border-crimson hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                onUploadingChange(true);

                const data = await uploadImage(file, "content", null, null, PHOTO_UPLOAD_OPTIONS);
                const imageUrl = data?.imageUrl;

                if (!imageUrl) {
                  throw new Error("No image URL returned.");
                }

                onChange(imageUrl);
              } catch (error) {
                console.error("Failed to upload image:", error);
                toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
              } finally {
                onUploadingChange(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      )}
    </div>
  );
};

export default function AS_Homepage() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [homeContent, setHomeContent] =
    useState<HomeCMSContent>(emptyHomeContent);

  const [originalHomeContent, setOriginalHomeContent] =
    useState<HomeCMSContent>(emptyHomeContent);

  const [carouselImages, setCarouselImages] = useState<CarouselItem[]>([]);
  const [originalCarouselImages, setOriginalCarouselImages] = useState<
    CarouselItem[]
  >([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingCarousel, setIsUploadingCarousel] = useState(false);
  const [isUploadingAboutImage, setIsUploadingAboutImage] = useState(false);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadHomepageContent = async () => {
      try {
        const [contentData, carouselData] = await Promise.all([
          fetchHomeContent(),
          fetchCarousel(),
        ]);

        const normalizedContent: HomeCMSContent = {
          ...emptyHomeContent,
          home_title: contentData.home_title || "",
          home_services_subtitle: contentData.home_services_subtitle || "",
          home_about_subtitle: contentData.home_about_subtitle || "",
          home_about_image: contentData.home_about_image || "",
          // Prefilled so a backend without the key can still be saved (every field is required)
          home_hero_image: contentData.home_hero_image || DEFAULT_HERO_IMAGE,
        };

        const normalizedCarousel: CarouselItem[] = carouselData
          .slice(0, 10)
          .map((item, index) => ({
            ...item,
            position: index + 1,
          }));

        setHomeContent(normalizedContent);
        setOriginalHomeContent(normalizedContent);
        setCarouselImages(normalizedCarousel);
        setOriginalCarouselImages(normalizedCarousel);
      } catch (error) {
        console.error("Failed to fetch homepage content:", error);
        toast.show("error", "Couldn't load the homepage", "We couldn't load the current homepage content, so the form may look empty. Please refresh the page before editing, so you don't replace your existing content.");
      } finally {
        setIsLoading(false);
      }
    };

    loadHomepageContent();
  }, []);

  const updateField = (key: keyof HomeCMSContent, value: string) => {
    setHomeContent((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCancel = () => {
    setHomeContent(originalHomeContent);
    setCarouselImages(originalCarouselImages);
    setIsEditing(false);
  };

  const handleRemoveCarouselImage = (indexToRemove: number) => {
    setCarouselImages((prev) =>
      prev
        .filter((_, index) => index !== indexToRemove)
        .map((item, index) => ({
          ...item,
          position: index + 1,
        }))
    );
  };

  const handleSave = async () => {
    const trimmedContent: HomeCMSContent = Object.fromEntries(
      Object.entries(homeContent).map(([key, value]) => [key, value.trim()])
    ) as HomeCMSContent;

    const hasEmptyField = Object.values(trimmedContent).some(
      (value) => !value
    );

    if (hasEmptyField) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }

    if (carouselImages.length === 0) {
      toast.show("error", "Add at least one photo", "The home carousel needs at least one photo before it can be saved.");
      return;
    }

    if (carouselImages.length > 10) {
      toast.show("error", "Too many photos", "The home carousel holds up to 10 photos. Remove one before adding another.");
      return;
    }

    const normalizedCarousel = carouselImages.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    try {
      setIsSaving(true);
      const token = await getToken();

      await updateHomeContent(trimmedContent, token, currentUser?.id);
      await updateCarousel(normalizedCarousel, token, currentUser?.id);

      const [refreshedContent, refreshedCarousel] = await Promise.all([
        fetchHomeContent(),
        fetchCarousel(),
      ]);

      const normalizedContent: HomeCMSContent = {
        ...emptyHomeContent,
        home_title: refreshedContent.home_title || "",
        home_services_subtitle: refreshedContent.home_services_subtitle || "",
        home_about_subtitle: refreshedContent.home_about_subtitle || "",
        home_about_image: refreshedContent.home_about_image || "",
        home_hero_image: refreshedContent.home_hero_image || DEFAULT_HERO_IMAGE,
      };

      const normalizedRefreshedCarousel: CarouselItem[] = refreshedCarousel
        .slice(0, 10)
        .map((item, index) => ({
          ...item,
          position: index + 1,
        }));

      setHomeContent(normalizedContent);
      setOriginalHomeContent(normalizedContent);
      setCarouselImages(normalizedRefreshedCarousel);
      setOriginalCarouselImages(normalizedRefreshedCarousel);
      setIsEditing(false);
      toast.show("success", "Homepage saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save homepage content:", error);
      toast.show("error", "Changes not saved", "We couldn't save your changes, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading the homepage" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:h-screen px-2 py-2 sm:px-4 sm:py-4 bg-light-orange overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex flex-wrap justify-between items-center gap-4 w-full">
            <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
              Homepage
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
          <div className="flex flex-col w-full rounded-sm sm:rounded-sm px-4 sm:px-4 py-2 shadow-sm bg-light-orange/40">
            <h3 className="font-bold text-[17px] text-gray-red min-h-[35px] flex items-center">
              Homepage
            </h3>

              <div className="flex flex-col gap-4">
                <InputField
                  label="Home Title"
                  value={homeContent.home_title}
                  onChange={(e) => updateField("home_title", e.target.value)}
                  isEditing={isEditing}
                />

                <ImageField
                  title="Home Hero Image"
                  value={homeContent.home_hero_image}
                  isEditing={isEditing}
                  isUploading={isUploadingHeroImage}
                  onUploadingChange={setIsUploadingHeroImage}
                  onChange={(url) => updateField("home_hero_image", url)}
                  onPreview={setPreviewImageUrl}
                />

                <div className="flex flex-col gap-4 bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
                  <CardTitle
                    label={`Home Carousel (${carouselImages.length}/10)`}
                  />

                  <div className="flex flex-col gap-2">
                    {carouselImages.map((image, index) => (
                      <div
                        key={`${image.image_url}-${index}`}
                        className="flex items-center justify-between w-full min-h-[36px] bg-light-orange rounded-md px-4 py-1 overflow-visible border border-crimson-light/80"
                      >
                        <Button
                          variant="bare"
                          type="button"
                          onClick={() => setPreviewImageUrl(image.image_url)}
                          className="min-w-0 flex-1 cursor-pointer text-left text-[16px] leading-none truncate text-gray-red hover:underline"
                        >
                          {getFileName(image.image_url)}
                        </Button>

                        {isEditing && (
                          <Button
                            variant="bare"
                            type="button"
                            onClick={() => handleRemoveCarouselImage(index)}
                            disabled={isUploadingCarousel}
                            className="flex items-center justify-center w-7 h-7 shrink-0"
                          >
                            <XIcon size={28} className="text-crimson" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {isEditing && carouselImages.length < 10 && (
                    <label
                      className={`flex flex-col items-center justify-center w-full ${
                        !isUploadingCarousel
                          ? "cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
                        <UploadIcon size={28} className="text-crimson" />
                      </div>

                      <p className="text-[13px] text-gray-red">
                        {isUploadingCarousel
                          ? "Uploading photo..."
                          : "Click here to upload a photo"}
                      </p>

                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        disabled={isUploadingCarousel}
                        className="border border-crimson-light focus:border-crimson hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            setIsUploadingCarousel(true);

                            const data = await uploadImage(file, "carousel", null, null, PHOTO_UPLOAD_OPTIONS);
                            const imageUrl = data?.imageUrl;

                            if (!imageUrl) {
                              throw new Error("No image URL returned.");
                            }

                            setCarouselImages((prev) => {
                              if (prev.length >= MAX_CAROUSEL_IMAGES)
                                return prev;

                              return [
                                ...prev,
                                {
                                  id: -Date.now(),
                                  image_url: imageUrl,
                                  position: prev.length + 1,
                                },
                              ];
                            });
                          } catch (error) {
                            console.error(
                              "Failed to upload carousel image:",
                              error
                            );
                            toast.show("error", "Photo not uploaded", "We couldn't upload that photo to the carousel. Please check that it is an image file and try again.");
                          } finally {
                            setIsUploadingCarousel(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}

                  {isEditing && carouselImages.length >= 10 && (
                    <p className="text-[13px] text-gray-red text-center mt-2">
                      Maximum of 10 carousel photos reached.
                    </p>
                  )}
                </div>

                <InputField
                  label="Home Services Subtitle"
                  value={homeContent.home_services_subtitle}
                  onChange={(e) =>
                    updateField("home_services_subtitle", e.target.value)
                  }
                  isEditing={isEditing}
                />

                <InputField
                  label="Home About Subtitle"
                  value={homeContent.home_about_subtitle}
                  onChange={(e) =>
                    updateField("home_about_subtitle", e.target.value)
                  }
                  isEditing={isEditing}
                />

                <ImageField
                  title="Home About Image"
                  value={homeContent.home_about_image}
                  isEditing={isEditing}
                  isUploading={isUploadingAboutImage}
                  onUploadingChange={setIsUploadingAboutImage}
                  onChange={(url) => updateField("home_about_image", url)}
                  onPreview={setPreviewImageUrl}
                />

                <EditActions
                  isEditing={isEditing}
                  isSaving={isSaving}
                  busy={isUploadingCarousel || isUploadingAboutImage || isUploadingHeroImage}
                  onEdit={() => setIsEditing(true)}
                  onCancel={handleCancel}
                  onSave={handleSave}
                />
              </div>
          </div>
        </div>
      </div>

      <AS_ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </div>
  );
}
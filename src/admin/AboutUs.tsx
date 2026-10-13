"use client";

import { Upload as UploadIcon, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import ImagePreviewModal from "../components/admin/ImagePreviewModal";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";

import {
  fetchAboutContent,
  updateAboutContent,
  uploadAboutImage,
  type AboutContent,
} from "../services/aboutService";
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

const emptyAboutContent: AboutContent = {
  about_description: "",
  about_image: "",
  about_location: "",
  about_location_url: "",
  about_business_hours_Monday: "",
  about_business_hours_Tuesday: "",
  about_business_hours_Wednesday: "",
  about_business_hours_Thursday: "",
  about_business_hours_Friday: "",
  about_business_hours_Saturday: "",
  about_business_hours_Sunday: "",
};

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
    if (!isTextarea || !textareaRef.current) return;

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
    <div className="flex flex-col gap-4 rounded-xl bg-crimson-light/15 px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[17px] tracking-wide text-gray-red">{label}</h3>
      </div>

      <div className="w-full h-[1.5px] bg-crimson mb-2" />

      <textarea
        ref={textareaRef}
        disabled={!isEditing}
        value={value}
        onChange={onChange}
        className="border border-crimson-light focus:border-crimson w-full min-h-[32px] mt-1 bg-transparent outline-none resize-none overflow-hidden text-[16px] text-gray-red disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default function AboutUs() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [aboutContent, setAboutContent] =
    useState<AboutContent>(emptyAboutContent);

  const [originalAboutContent, setOriginalAboutContent] =
    useState<AboutContent>(emptyAboutContent);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadAboutContent = async () => {
      try {
        const data = await fetchAboutContent();

        const normalizedData: AboutContent = {
          ...emptyAboutContent,
          ...data,
        };

        setAboutContent(normalizedData);
        setOriginalAboutContent(normalizedData);
      } catch (error) {
        console.error("Failed to fetch about content:", error);
        toast.show("error", "Couldn't load About us", "We couldn't load the current About us content, so the form may look empty. Please refresh the page before editing, so you don't replace your existing text.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAboutContent();
  }, []);

  const updateField = (key: keyof AboutContent, value: string) => {
    setAboutContent((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCancel = () => {
    setAboutContent(originalAboutContent);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedContent: AboutContent = Object.fromEntries(
      Object.entries(aboutContent).map(([key, value]) => [key, value.trim()])
    ) as AboutContent;

    const hasEmptyField = Object.values(trimmedContent).some(
      (value) => !value
    );

    if (hasEmptyField) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }

    try {
      setIsSaving(true);
      const token = await getToken();

      await updateAboutContent(trimmedContent, token, currentUser?.id);

      const refreshedContent = await fetchAboutContent();

      const normalizedContent: AboutContent = {
        ...emptyAboutContent,
        ...refreshedContent,
      };

      setAboutContent(normalizedContent);
      setOriginalAboutContent(normalizedContent);
      setIsEditing(false);
      toast.show("success", "About us saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save about content:", error);
      toast.show("error", "Changes not saved", "We couldn't save your changes, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const businessHourFields: Array<keyof AboutContent> = [
    "about_business_hours_Monday",
    "about_business_hours_Tuesday",
    "about_business_hours_Wednesday",
    "about_business_hours_Thursday",
    "about_business_hours_Friday",
    "about_business_hours_Saturday",
    "about_business_hours_Sunday",
  ];

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading About us" />
      </div>
    );
  }

  return (
    <AdminShell title="About Us">

        <div className="flex-1 overflow-y-auto pb-2">
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk px-4 py-3 shadow-petal sm:px-5">
            <h3 className="font-bold text-[17px] text-gray-red min-h-[35px] flex items-center">
              About Us
            </h3>

              <div className="flex flex-col gap-4">
                <InputField
                  label="Description"
                  value={aboutContent.about_description}
                  onChange={(e) =>
                    updateField("about_description", e.target.value)
                  }
                  isEditing={isEditing}
                />

                <div className="flex flex-col gap-4 rounded-xl bg-crimson-light/15 px-4 py-2">
                  <CardTitle label="Photo" />

                  {aboutContent.about_image && (
                    <div className="flex items-center justify-between w-full min-h-[36px] bg-milk rounded-md px-4 py-1 overflow-visible border border-crimson-light">
                      <Button
                        variant="bare"
                        type="button"
                        onClick={() => setPreviewImageUrl(aboutContent.about_image)}
                        className="min-w-0 flex-1 cursor-pointer text-left text-[16px] leading-none truncate text-gray-red hover:underline"
                      >
                        {aboutContent.about_image.split("/").pop()}
                      </Button>

                      {isEditing && (
                        <Button
                          variant="bare"
                          type="button"
                          onClick={() => updateField("about_image", "")}
                          disabled={isUploading}
                          className="flex items-center justify-center w-7 h-7 shrink-0"
                        >
                          <XIcon size={28} className="text-crimson" />
                        </Button>
                      )}
                    </div>
                  )}

                  {isEditing && !aboutContent.about_image && (
                    <label
                      className={`flex flex-col items-center justify-center w-full ${
                        !isUploading ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
                        <UploadIcon size={28} className="text-crimson" />
                      </div>

                      <p className="text-[13px] text-gray-red">
                        {isUploading
                          ? "Uploading photo..."
                          : "Click here to upload a photo"}
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
                            setIsUploading(true);
                            const token = await getToken();
                            const data = await uploadAboutImage(file, token, currentUser?.id);
                            updateField("about_image", data.imageUrl);
                          } catch (error) {
                            console.error("Failed to upload image:", error);
                            toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
                          } finally {
                            setIsUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <InputField
                  label="Location"
                  value={aboutContent.about_location}
                  onChange={(e) =>
                    updateField("about_location", e.target.value)
                  }
                  isEditing={isEditing}
                />

                <InputField
                  label="Location URL Link"
                  value={aboutContent.about_location_url}
                  onChange={(e) =>
                    updateField("about_location_url", e.target.value)
                  }
                  isEditing={isEditing}
                />

                <div className="flex flex-col gap-4 rounded-xl bg-crimson-light/15 px-4 py-2">
                  <CardTitle label="Business Hours" />

                  <div className="flex flex-col gap-2">
                    {businessHourFields.map((key) => (
                      <input
                        key={key}
                        type="text"
                        disabled={!isEditing}
                        value={aboutContent[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full h-[35px] bg-milk rounded-md px-4 text-[16px] text-gray-red outline-none disabled:opacity-100 disabled:cursor-not-allowed border border-crimson-light"
                      />
                    ))}
                  </div>
                </div>

                <EditActions
                  isEditing={isEditing}
                  isSaving={isSaving}
                  busy={isUploading}
                  onEdit={() => setIsEditing(true)}
                  onCancel={handleCancel}
                  onSave={handleSave}
                />
              </div>
          </div>
        </div>
      

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </AdminShell>
  );
}
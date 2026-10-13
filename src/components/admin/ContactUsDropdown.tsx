import { ChevronDown as DropdownIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { updateContent } from "../../services/contentService";
import { useToast } from "../ui/ToastProvider";
import EditActions from "./EditActions";
import Button from "../ui/Button";

type Field = {
  label: string;
  key: string;
};

type Props = {
  title: string;
  type: "group" | "social";
  fields?: Field[];
  content: Record<string, string>;
  onUpdated: (updatedValues: Record<string, string>) => void;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
};

const platforms = [
  { name: "Facebook", key: "facebook" },
  { name: "Instagram", key: "instagram" },
  { name: "TikTok", key: "tiktok" },
];

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ContactUsDropdown: React.FC<Props> = ({
  title,
  type,
  fields = [],
  content,
  onUpdated,
  tokenFetcher,
  clerkId,
}) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [localData, setLocalData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEditing) {
      setLocalData(content);
      setOriginalData(content);
    }
  }, [content, isEditing]);

  const visibleKeys = useMemo(() => {
    if (type === "group") {
      return fields.map((field) => field.key);
    }

    return platforms.flatMap((platform) => [
      `social_${platform.key}_name`,
      `social_${platform.key}_url`,
    ]);
  }, [fields, type]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleCancel = () => {
    setLocalData(originalData);
    setIsEditing(false);
  };

  const handleChange = (key: string, value: string) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (type === "group") {
      for (const field of fields) {
        const value = (localData[field.key] || "").trim();

        if (!value) {
          return `${field.label} cannot be empty.`;
        }

        if (field.key === "contact_email" && !isValidEmail(value)) {
          return "Please enter a valid email address.";
        }

        if (field.key === "contact_location_url" && !isValidUrl(value)) {
          return "Please enter a valid location URL.";
        }
      }
    }

    if (type === "social") {
      for (const platform of platforms) {
        const nameKey = `social_${platform.key}_name`;
        const urlKey = `social_${platform.key}_url`;
        const name = (localData[nameKey] || "").trim();
        const url = (localData[urlKey] || "").trim();

        if (!name) {
          return `${platform.name} username cannot be empty.`;
        }

        if (!url) {
          return `${platform.name} URL cannot be empty.`;
        }

        if (!isValidUrl(url)) {
          return `${platform.name} URL must be valid.`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      toast.show("error", "Please check the form", `${validationError} Nothing was saved.`);
      return;
    }

    try {
      setIsSaving(true);
      const token = await tokenFetcher();

      const updatedValues: Record<string, string> = {};

      for (const key of visibleKeys) {
        const value = (localData[key] || "").trim();
        await updateContent(key, value, token, clerkId);
        updatedValues[key] = value;
      }

      setOriginalData((prev) => ({ ...prev, ...updatedValues }));
      onUpdated(updatedValues);
      setIsEditing(false);
      toast.show("success", "Contact details saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.show("error", "Changes not saved", error instanceof Error ? error.message : "We couldn't save your changes, so the website still shows the previous contact details. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full rounded-2xl border border-crimson-light/40 bg-milk px-4 py-3 shadow-petal sm:px-5">
      <Button
        variant="bare"
        type="button"
        onClick={handleToggleOpen}
        className="flex items-center justify-between w-full gap-4 text-left min-h-[35px]"
      >
        <p className="md:px-0 px-2 font-bold text-[17px] uppercase truncate text-gray-red">
          {title}
        </p>

        <DropdownIcon
          size={32} className={`text-gray-red shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-4">
          {type === "group" &&
            fields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl bg-crimson-light/15 px-4 py-2"
              >
                <h3 className="text-[17px] mb-2 tracking-wide text-gray-red">
                  {field.label}
                </h3>

                <div className="w-full h-[1.5px] bg-crimson mb-2" />

                <textarea
                  ref={(el) => {
                    if (el) {
                      el.style.height = "0px";
                      el.style.height = `${Math.max(el.scrollHeight, 32)}px`;
                    }
                  }}
                  disabled={!isEditing}
                  value={localData[field.key] || ""}
                  onChange={(e) => {
                    handleChange(field.key, e.target.value);
                    e.currentTarget.style.height = "0px";
                    e.currentTarget.style.height = `${Math.max(
                      e.currentTarget.scrollHeight,
                      32,
                    )}px`;
                  }}
                  className="w-full mt-1 min-h-[32px] bg-transparent outline-none resize-none overflow-hidden text-[16px] text-gray-red whitespace-pre-line disabled:cursor-not-allowed"
                />
              </div>
            ))}

          {type === "social" && (
            <div className="rounded-xl bg-crimson-light/15 px-4 py-4 overflow-x-hidden flex flex-col gap-4">
              <h3 className="hidden md:grid grid-cols-[140px_1fr_1fr] gap-8 text-[16px]">
                <div className="text-center">Platform</div>
                <div className="text-center">Username</div>
                <div className="text-center">URL Link</div>
              </h3>

              <div className="flex flex-col gap-4 md:gap-4">
                {platforms.map((platform) => (
                  <div
                    key={platform.key}
                    className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-2 md:gap-8 md:items-center"
                  >
                    <p className="text-[16px] font-bold md:font-normal whitespace-nowrap">
                      {platform.name}
                    </p>

                    <div className="flex flex-col gap-1">
                      <p className="md:hidden text-[14px] text-gray-red">
                        Username
                      </p>

                      <input
                        disabled={!isEditing}
                        value={localData[`social_${platform.key}_name`] || ""}
                        onChange={(e) =>
                          handleChange(
                            `social_${platform.key}_name`,
                            e.target.value,
                          )
                        }
                        className="w-full px-4 py-2 rounded-md bg-milk outline-none text-gray-red text-[15px] disabled:cursor-not-allowed border border-crimson-light"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="md:hidden text-[14px] text-gray-red">
                        URL Link
                      </p>

                      <input
                        disabled={!isEditing}
                        value={localData[`social_${platform.key}_url`] || ""}
                        onChange={(e) =>
                          handleChange(
                            `social_${platform.key}_url`,
                            e.target.value,
                          )
                        }
                        className="w-full px-4 py-2 rounded-md bg-milk outline-none text-gray-red text-[15px] disabled:cursor-not-allowed border border-crimson-light"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center mb-1">
            <EditActions
              isEditing={isEditing}
              isSaving={isSaving}
              onEdit={() => setIsEditing(true)}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsDropdown;
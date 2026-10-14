import { ChevronDown as DropdownIcon, List as ListIcon, Plus as PlusIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { IconButton, Button } from "@/components/atoms";
import { DragHandle, useToast, EditActions } from "@/components/molecules";
import type { SortableHandleProps } from "@/components/molecules";
import type { Tac } from "../../services/tacService";
import { createTac, deleteTac, updateTac } from "../../services/tacService";
import {
  handleBulletBackspace,
  handleBulletEnter,
  toggleBulletList,
} from "./ListFormatting";
import { ConfirmDialog } from "@/components/organisms";

type DropdownProps = {
  tac?: Tac;
  mode?: "edit" | "create";
  onTacUpdated?: (updatedTac: Tac) => void;
  onTacCreated?: (createdTac: Tac) => void;
  onTacDeleted?: (tacId: number) => void;
  dragHandleProps?: SortableHandleProps;
  isDragging?: boolean;
  isDragOverlay?: boolean;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  isEditing: boolean;
  isTextarea?: boolean;
  labelClassName?: string;
  showListButton?: boolean;
};

const InputField = ({
  label,
  value,
  onChange,
  isEditing,
  isTextarea = false,
  labelClassName = "",
  showListButton = false,
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
  }, [value]);

  const handleInsertBullet = () => {
    if (!textareaRef.current || !isEditing) return;

    const textarea = textareaRef.current;

    const result = toggleBulletList({
      value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });

    const syntheticEvent = {
      target: { value: result.newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);

    requestAnimationFrame(() => {
      autoResizeTextarea();
      textarea.focus();
      textarea.setSelectionRange(
        result.newSelectionStart,
        result.newSelectionEnd
      );
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current || !isEditing) return;

    const textarea = textareaRef.current;

    if (e.key === "Enter") {
      if (textarea.selectionStart !== textarea.selectionEnd) return;

      const result = handleBulletEnter(value, textarea.selectionStart);

      if (!result) return;

      e.preventDefault();

      const syntheticEvent = {
        target: { value: result.newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);

      requestAnimationFrame(() => {
        autoResizeTextarea();
        textarea.focus();
        textarea.setSelectionRange(
          result.newCursorPosition,
          result.newCursorPosition
        );
      });

      return;
    }

    if (e.key === "Backspace") {
      if (textarea.selectionStart !== textarea.selectionEnd) return;

      const result = handleBulletBackspace(value, textarea.selectionStart);

      if (!result) return;

      e.preventDefault();

      const syntheticEvent = {
        target: { value: result.newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);

      requestAnimationFrame(() => {
        autoResizeTextarea();
        textarea.focus();
        textarea.setSelectionRange(
          result.newCursorPosition,
          result.newCursorPosition
        );
      });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <h3 className={`text-[13px] font-medium text-gray-red/80 ${labelClassName}`}>{label}</h3>

        {isTextarea && showListButton && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-[18px] w-[1.5px] bg-crimson" />
            <div className="flex items-center gap-2">
              <IconButton label="Add a bullet list" icon={ListIcon} tone="plain"
                onClick={handleInsertBullet}
                disabled={!isEditing}
              />
            </div>
          </div>
        )}
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
        onKeyDown={handleKeyDown}
        className="w-full min-h-[38px] rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none resize-none overflow-hidden whitespace-pre-line focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
};

const TACDropdown: React.FC<DropdownProps> = ({
  tac,
  mode = "edit",
  onTacUpdated,
  onTacCreated,
  onTacDeleted,
  dragHandleProps,
  isDragging = false,
  isDragOverlay = false,
  tokenFetcher,
  clerkId,
}) => {
  const toast = useToast();
  const isCreateMode = mode === "create";

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [section, setSection] = useState(tac?.section ?? "");
  const [content, setContent] = useState(tac?.content ?? "");
  const [displayOrder, setDisplayOrder] = useState<number | "">(
    tac?.display_order ?? ""
  );
  const [originalSection, setOriginalSection] = useState(tac?.section ?? "");
  const [originalContent, setOriginalContent] = useState(tac?.content ?? "");
  const [originalDisplayOrder, setOriginalDisplayOrder] = useState<number | "">(
    tac?.display_order ?? ""
  );

  useEffect(() => {
    if (!isCreateMode && tac) {
      setSection(tac.section);
      setContent(tac.content);
      setDisplayOrder(tac.display_order ?? "");
      setOriginalSection(tac.section);
      setOriginalContent(tac.content);
      setOriginalDisplayOrder(tac.display_order ?? "");
    }
  }, [tac, isCreateMode]);

  const resetCreateForm = () => {
    setSection("");
    setContent("");
    setDisplayOrder("");
    setOriginalSection("");
    setOriginalContent("");
    setOriginalDisplayOrder("");
    setIsOpen(false);
    setIsEditing(true);
  };

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleCancel = () => {
    if (isCreateMode) {
      resetCreateForm();
      return;
    }

    setSection(originalSection);
    setContent(originalContent);
    setDisplayOrder(originalDisplayOrder);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedSection = section.trim();
    const trimmedContent = content.trim();

    if (!trimmedSection || !trimmedContent) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }

    try {
      setIsSaving(true);
      const token = tokenFetcher ? await tokenFetcher() : null;

      if (isCreateMode) {
        const createdTac = await createTac(
          trimmedSection,
          trimmedContent,
          Number(displayOrder),
          token,
          clerkId
        );
        onTacCreated?.(createdTac);
        resetCreateForm();
        toast.show("success", "Section added", "The new terms and conditions section is now live on the website.");
        return;
      }

      if (!tac) return;

      const updatedTac = await updateTac(
        tac.id,
        trimmedSection,
        trimmedContent,
        Number(displayOrder),
        token,
        clerkId
      );

      setSection(updatedTac.section);
      setContent(updatedTac.content);
      setDisplayOrder(updatedTac.display_order ?? "");
      setOriginalSection(updatedTac.section);
      setOriginalContent(updatedTac.content);
      setOriginalDisplayOrder(updatedTac.display_order ?? "");
      setIsEditing(false);
      onTacUpdated?.(updatedTac);
      toast.show("success", "Section saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save TAC:", error);
      toast.show("error", "Changes not saved", "We couldn't save this terms and conditions section, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tac) return;

    try {
      setIsDeleting(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteTac(tac.id, token, clerkId);
      setIsDeleteModalOpen(false);
      onTacDeleted?.(tac.id);
      toast.show("success", "Section deleted", "The section was removed from the terms and conditions.");
    } catch (error) {
      console.error("Failed to delete TAC:", error);
      toast.show("error", "Section not deleted", "We couldn't delete this terms and conditions section, so it is still on the website. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isCreateMode ? "Add Section" : section;

  return (
    <>
      <div
        className={[
          "flex flex-col w-full rounded-xl border border-crimson-light/50 px-3 py-2.5 transition-[transform,box-shadow,opacity] duration-200",
          isDragOverlay
            ? "bg-milk shadow-2xl scale-[1.02]"
            : "bg-milk",
          isDragging ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        {/* The drag handle sits beside the toggle, not inside it: a button can't hold a button */}
        <div className="flex min-h-[35px] items-center gap-2 sm:gap-3">
          {!isCreateMode && <DragHandle {...(dragHandleProps ?? {})} />}

          <Button
            variant="bare"
            type="button"
            onClick={handleToggleOpen}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
          >
            <span className="block min-w-0 font-bold text-[15px] truncate text-gray-red uppercase">
              {title || "Untitled"}
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
            isOpen ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-4">
            <InputField
              label="Section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              isEditing={isEditing}
              isTextarea
              labelClassName="tracking-wide"
            />

            <InputField
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              isEditing={isEditing}
              isTextarea
              showListButton
              labelClassName="tracking-wide"
            />

            <EditActions
              isEditing={isEditing}
              isCreateMode={isCreateMode}
              isSaving={isSaving}
              onEdit={() => setIsEditing(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              onDelete={() => setIsDeleteModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {!isCreateMode && !isDragOverlay && (
        <ConfirmDialog
          open={isDeleteModalOpen}
          title="Delete section?"
          confirmLabel="Delete section"
          loadingLabel="Deleting..."
          loading={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        >
          Are you sure you want to delete this section? This action cannot be undone.
        </ConfirmDialog>
      )}
    </>
  );
};

export default TACDropdown;
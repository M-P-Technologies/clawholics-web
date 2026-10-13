import { ChevronDown as DropdownIcon, Plus as PlusIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import DragIcon from "./DragIcon";
import ListIconButton from "./ListIconButton";
import type { SortableHandleProps } from "./SortableList";
import type { Faq } from "../../services/faqService";
import { createFaq, deleteFaq, updateFaq } from "../../services/faqService";
import {
  handleBulletBackspace,
  handleBulletEnter,
  toggleBulletList,
} from "./ListFormatting";
import { useToast } from "../ui/ToastProvider";
import EditActions from "./EditActions";
import Button from "../ui/Button";
import ConfirmModal from "../ui/ConfirmModal";

type DropdownProps = {
  faq?: Faq;
  mode?: "edit" | "create";
  onFaqUpdated?: (updatedFaq: Faq) => void;
  onFaqCreated?: (createdFaq: Faq) => void;
  onFaqDeleted?: (faqId: number) => void;
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
      32,
    )}px`;
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [value, isTextarea]);

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
        result.newSelectionEnd,
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
          result.newCursorPosition,
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
          result.newCursorPosition,
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
              <ListIconButton
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
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[38px] rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none resize-none overflow-hidden whitespace-pre-line focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
};

const FAQDropdown: React.FC<DropdownProps> = ({
  faq,
  mode = "edit",
  onFaqUpdated,
  onFaqCreated,
  onFaqDeleted,
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

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [displayOrder, setDisplayOrder] = useState<number | "">(
    faq?.display_order ?? "",
  );

  const [originalQuestion, setOriginalQuestion] = useState(faq?.question ?? "");
  const [originalAnswer, setOriginalAnswer] = useState(faq?.answer ?? "");
  const [originalDisplayOrder, setOriginalDisplayOrder] = useState<number | "">(
    faq?.display_order ?? "",
  );

  useEffect(() => {
    if (!isCreateMode && faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setDisplayOrder(faq.display_order ?? "");
      setOriginalQuestion(faq.question);
      setOriginalAnswer(faq.answer);
      setOriginalDisplayOrder(faq.display_order ?? "");
    }
  }, [faq, isCreateMode]);

  const resetCreateForm = () => {
    setQuestion("");
    setAnswer("");
    setDisplayOrder("");
    setOriginalQuestion("");
    setOriginalAnswer("");
    setOriginalDisplayOrder("");
    setIsOpen(false);
    setIsEditing(true);
  };

  const handleToggleOpen = () => {
    setIsOpen((prevState) => !prevState);
  };

  const handleCancel = () => {
    if (isCreateMode) {
      resetCreateForm();
      return;
    }

    setQuestion(originalQuestion);
    setAnswer(originalAnswer);
    setDisplayOrder(originalDisplayOrder);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();

    if (!trimmedQuestion || !trimmedAnswer) {
      toast.show("error", "Question or answer is empty", "Please write both the question and its answer before saving. Nothing was saved.");
      return;
    }

    try {
      setIsSaving(true);
      const token = tokenFetcher ? await tokenFetcher() : null;

      if (isCreateMode) {
        const createdFaq = await createFaq(
          trimmedQuestion,
          trimmedAnswer,
          Number(displayOrder),
          token,
          clerkId
        );
        onFaqCreated?.(createdFaq);
        resetCreateForm();
        toast.show("success", "FAQ added", "The new question is now live in the FAQ section of the website.");
        return;
      }

      if (!faq) return;

      const updatedFaq = await updateFaq(
        faq.id,
        trimmedQuestion,
        trimmedAnswer,
        Number(displayOrder),
        token,
        clerkId
      );

      setQuestion(updatedFaq.question);
      setAnswer(updatedFaq.answer);
      setDisplayOrder(updatedFaq.display_order ?? "");
      setOriginalQuestion(updatedFaq.question);
      setOriginalAnswer(updatedFaq.answer);
      setOriginalDisplayOrder(updatedFaq.display_order ?? "");
      setIsEditing(false);
      onFaqUpdated?.(updatedFaq);
      toast.show("success", "FAQ saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error(
        `Failed to ${isCreateMode ? "create" : "save"} FAQ:`,
        error,
      );
      toast.show(
        "error",
        isCreateMode ? "FAQ not created" : "FAQ not saved",
        "We couldn't save this FAQ, so the website is unchanged. Your edits are still on screen. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!faq) return;

    try {
      setIsDeleting(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteFaq(faq.id, token, clerkId);
      setIsDeleteModalOpen(false);
      onFaqDeleted?.(faq.id);
      toast.show("success", "FAQ deleted", "The question was removed from the website.");
    } catch (error) {
      console.error("Failed to delete FAQ:", error);
      toast.show("error", "FAQ not deleted", "We couldn't delete this FAQ, so it is still on the website. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isCreateMode ? "Add FAQ" : question;

  return (
    <>
      <div
        className={[
          "flex flex-col w-full rounded-xl border border-crimson-light/50 px-3 py-2.5 transition-[transform,box-shadow,opacity] duration-200",
          isDragOverlay ? "bg-milk shadow-2xl scale-[1.02]" : "bg-milk",
          isDragging ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        {/* The drag handle sits beside the toggle, not inside it: a button can't hold a button */}
        <div className="flex min-h-[35px] items-center gap-2 sm:gap-3">
          {!isCreateMode && <DragIcon {...(dragHandleProps ?? {})} />}

          <Button
            variant="bare"
            type="button"
            onClick={handleToggleOpen}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
          >
            <span className="block min-w-0 font-bold text-[15px] truncate text-gray-red">
              {title || "Untitled FAQ"}
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
              label="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              isEditing={isEditing}
              isTextarea
              labelClassName="tracking-wide"
            />

            <InputField
              label="Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
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
        <ConfirmModal
          open={isDeleteModalOpen}
          title="Delete FAQ?"
          confirmLabel="Delete FAQ"
          loadingLabel="Deleting..."
          loading={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        >
          Are you sure you want to delete this FAQ? This action cannot be undone.
        </ConfirmModal>
      )}
    </>
  );
};

export default FAQDropdown;
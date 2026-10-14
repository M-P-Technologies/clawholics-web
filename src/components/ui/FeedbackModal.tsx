import React from "react";
import { Button } from "@/components/atoms";

const modalContent = {
  success: {
    title: "Message sent",
    message:
      "Thank you for reaching out! We received your message and will reply to the email address you gave us. If you don't see our reply, please check your spam folder.",
  },
  networkError: {
    title: "No connection",
    message:
      "We couldn't send your message because the connection was lost. Your text is still in the form, so you can try again as soon as you are back online.",
  },
  generalError: {
    title: "Message not sent",
    message:
      "Something went wrong on our side, so your message was not sent. Your text is still in the form. Please try again in a moment, or message us on social media instead.",
  },
  invalidEmail: {
    title: "Check your email address",
    message:
      "That email address doesn't look right, so we couldn't send your message. Please use the format name@example.com.",
  },
};

export type ModalType =
  | "success"
  | "networkError"
  | "generalError"
  | "invalidEmail"
  | null;

interface FeedbackModalProps {
  isOpen: boolean;
  type: ModalType;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  type,
  onClose,
}) => {
  if (!isOpen || !type) return null;

  const { title, message } = modalContent[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 p-8 backdrop-blur-sm drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-sm border border-crimson-light bg-light-orange p-8 text-center md:gap-8 md:p-12 shadow-2xl shadow-crimson/20 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="feedback-modal-title"
          className="font-display text-3xl font-normal not-italic uppercase leading-tight tracking-widest text-gray-red"
        >
          {title}
        </h2>

        <p className="copy-lead">{message}</p>

        <Button onClick={onClose} >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default FeedbackModal;

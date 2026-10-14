import { Check, X } from "lucide-react";
import { Button } from "@/components/atoms";

interface FeedbackModalProps {
  open: boolean;
  title: string;
  message: string;
  isError: boolean;
  onClose: () => void;
}

// Says how an action ended (done, or what went wrong), with one button to go on
export default function FeedbackModal({ open, title, message, isError, onClose }: FeedbackModalProps) {
  if (!open) return null;
  const Icon = isError ? X : Check;
  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
      <div className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-sm w-full text-center shadow-xl transform transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${isError ? "bg-danger/10" : "bg-crimson/10"}`}>
          <Icon aria-hidden="true" className="h-8 w-8 text-gray-red" />
        </div>
        <h1 className="text-3xl text-crimson">{title}</h1>
        <p className="font-sans opacity-90 text-sm md:text-base leading-relaxed text-gray-red">{message}</p>
        <Button onClick={onClose} className="hover:scale-105 transition-transform">
          Continue
        </Button>
      </div>
    </div>
  );
}

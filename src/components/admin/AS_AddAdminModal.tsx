import { ArrowLeft as BackButtonIcon } from "lucide-react";
import React, { useState } from "react";
import { LoadingBar } from "../ui/LoadingBar";
import Button from "../ui/Button";

type AddAdminFormData = {
  email: string;
};

interface AddAdminModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddAdminFormData) => void;
  isSaving?: boolean;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({
  open,
  onClose,
  onSubmit,
  isSaving,
}) => {
  const [email, setEmail] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ email });
    setEmail("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-sm bg-light-orange border border-crimson p-8 md:p-8 shadow-xl transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        {isSaving ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingBar />
          </div>
        ) : (
          <>
            <div className="relative mb-8 flex items-center justify-center text-gray-red">
              <Button
                variant="bare"
                type="button"
                onClick={onClose}
                className="absolute left-0 flex items-center justify-center hover:scale-110 transition-transform"
              >
                <BackButtonIcon size={32} className="text-crimson" />
              </Button>
              <h1 className="text-center text-3xl leading-none font-display">
                CLAWHOLICS
              </h1>
            </div>

            <p className="mb-8 text-center text-[18px] text-gray-red opacity-90 font-sans">
              Promote an existing user to Admin.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8 font-sans">
              <div>
                <p className="block text-[16px] mb-2 text-gray-red font-bold opacity-80 ml-2">
                  User's Email Address:
                </p>
                <input
                  id="adminEmail"
                  name="adminEmail"
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., teammate@example.com"
                  className="h-11 w-full rounded-md bg-light-orange px-4 outline-none border border-crimson/20 focus:ring-1 focus:ring-crimson text-gray-red transition-shadow"
                />
              </div>

              <div className="mt-8 flex items-center justify-center">
                <Button
                  type="submit"
                  className="hover:scale-105"
                >
                  MAKE ADMIN
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddAdminModal;

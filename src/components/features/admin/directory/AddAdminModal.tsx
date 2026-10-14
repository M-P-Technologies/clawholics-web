import { ArrowLeft as BackButtonIcon } from "lucide-react";
import React, { useState } from "react";
import { LoadingBar, Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";

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
    <Dialog
      open={open}
      onClose={onClose}
      title="Add admin"
      placement="sheet"
      size="md"
      dismissible={!isSaving}
      header={
        isSaving ? (
          <span className="sr-only">Add admin</span>
        ) : (
          <div className="relative flex items-center justify-center text-gray-red">
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
        )
      }
    >
      {isSaving ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingBar inline />
        </div>
      ) : (
        <>
          <p className="my-4 text-center text-[18px] text-gray-red opacity-90 font-sans">
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
                className="h-11 w-full rounded-md bg-milk px-4 outline-none border border-crimson/20 focus:ring-1 focus:ring-crimson text-gray-red transition-shadow"
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
    </Dialog>
  );
};

export default AddAdminModal;

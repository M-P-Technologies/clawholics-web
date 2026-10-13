import { useState } from "react";
import { ChevronRight, Mail as EmailIcon, Phone as TelephoneIcon } from "lucide-react";
import Button from "../ui/Button";
import Sheet from "../ui/Sheet";
import type { DirectoryUser } from "./DirectoryProfileCard";

interface ClientRowProps {
  user: DirectoryUser;
  onEdit?: (user: DirectoryUser) => void;
  onDelete?: (user: DirectoryUser) => void;
  onNotes?: (user: DirectoryUser) => void;
}

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// The phone's version of a directory tile: one compact line per client; tapping it opens a sheet
// with the contact details and the actions.
export default function ClientRow({ user, onEdit, onDelete, onNotes }: ClientRowProps) {
  const [open, setOpen] = useState(false);

  const name = toTitleCase(user.fullName || user.name || `${user.firstName} ${user.lastName}`.trim() || "Unnamed Client");
  const visits =
    typeof user.visit_count === "number" ? `${user.visit_count} ${user.visit_count === 1 ? "visit" : "visits"}` : null;

  const act = (handler?: (user: DirectoryUser) => void) => () => {
    handler?.(user);
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-2xl border border-crimson-light/40 bg-milk shadow-petal">
        <Button variant="bare" type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[16px] font-bold text-gray-red">{name}</span>
              {user.is_recurring && (
                <span className="shrink-0 rounded-md bg-crimson px-2 py-0.5 text-[11px] font-bold text-light-orange">Recurring</span>
              )}
            </span>
            {visits && <span className="block text-[13px] text-gray-red/80">{visits}</span>}
          </span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-crimson" />
        </Button>

        {onNotes && (
          <Button variant="bare" type="button" onClick={() => onNotes(user)} className="mr-3 shrink-0 text-sm font-bold text-crimson">
            Notes
          </Button>
        )}
      </div>

      <Sheet open={open} title={name} onClose={() => setOpen(false)}>
        {(user.email || user.phoneNumber) && (
          <address className="flex flex-col gap-2 not-italic">
            {user.email && (
              <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-[15px] text-gray-red">
                <EmailIcon size={18} aria-hidden="true" className="shrink-0 text-crimson" />
                <span className="truncate">{user.email}</span>
              </a>
            )}
            {user.phoneNumber && (
              <a href={`tel:${user.phoneNumber}`} className="flex items-center gap-2 text-[15px] text-gray-red">
                <TelephoneIcon size={18} aria-hidden="true" className="shrink-0 text-crimson" />
                <span className="truncate">{user.phoneNumber}</span>
              </a>
            )}
          </address>
        )}

        <div className="flex flex-col">
          {onNotes && (
            <Button variant="bare" type="button" onClick={act(onNotes)} className="w-full justify-start py-3 text-left text-sm font-bold text-gray-red">
              Notes
            </Button>
          )}
          {onEdit && (
            <Button variant="bare" type="button" onClick={act(onEdit)} className="w-full justify-start py-3 text-left text-sm font-bold text-gray-red">
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="bare" type="button" onClick={act(onDelete)} className="w-full justify-start py-3 text-left text-sm font-bold text-danger">
              Delete
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}

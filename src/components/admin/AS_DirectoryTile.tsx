import { Ellipsis as MoreIcon, Mail as EmailIcon, Phone as TelephoneIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { parseServerTime } from "../../services/serverTime";
import Button from "../ui/Button";

export interface DirectoryUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role?: string;
  name?: string;
  fullName?: string;
  user_id?: number;
  visit_count?: number;
  last_visit?: string | null;
  is_recurring?: boolean;
}

interface Props {
  user: DirectoryUser;
  onEdit?: (user: DirectoryUser) => void;
  onDelete?: (user: DirectoryUser) => void;
  onNotes?: (user: DirectoryUser) => void;
}

function formatLastVisit(value?: string | null) {
  const time = parseServerTime(value);
  return Number.isNaN(time)
    ? ""
    : new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRoleLabel(role?: string) {
  const trimmedRole = role?.trim();

  if (!trimmedRole) {
    return "Client";
  }

  const normalizedRole = trimmedRole.toLowerCase();

  if (normalizedRole === "customer" || normalizedRole === "client") {
    return "Client";
  }

  return trimmedRole;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

const AS_DirectoryTile: React.FC<Props> = ({ user, onEdit, onDelete, onNotes }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const rawFullName =
  user.fullName ||
  user.name ||
  `${user.firstName} ${user.lastName}`.trim() ||
  "Unnamed Client";

  const fullName = toTitleCase(rawFullName);

  const formattedRole = getRoleLabel(user.role);

  const handleEdit = () => {
    onEdit?.(user);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(user);
    setIsMenuOpen(false);
  };

  const handleNotes = () => {
    onNotes?.(user);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const hasMenuOptions = onEdit || onDelete || onNotes;
  const lastVisit = formatLastVisit(user.last_visit);

  return (
    <div className="flex w-full flex-col">
      <article className="group relative flex h-full w-full flex-col items-center overflow-hidden rounded-sm bg-light-orange/40 p-4 duration-400">
        <div
          ref={menuContainerRef}
          className="mb-1 flex h-5 w-full items-center justify-between"
        >
          <h3 className="truncate text-[19px] font-bold">{fullName}</h3>

          {hasMenuOptions && (
            <>
              <Button
                variant="bare"
                type="button"
                onClick={toggleMenu}
                className={`transition-colors ${
                  isMenuOpen ? "text-light-orange" : ""
                }`}
              >
                <MoreIcon className="text-crimson h-5 w-7" />
              </Button>

              {isMenuOpen && (
                <div className="absolute right-5 top-10 z-10 min-w-35 overflow-hidden rounded-md bg-light-orange shadow-lg">
                  {onNotes && (
                    <Button
                      variant="bare"
                      type="button"
                      onClick={handleNotes}
                      className="block w-full px-4 py-2 text-left font-bold text-gray-red transition-colors duration-200 hover:bg-sand"
                    >
                      Notes
                    </Button>
                  )}

                  {onEdit && (
                    <Button
                      variant="bare"
                      type="button"
                      onClick={handleEdit}
                      className="block w-full px-4 py-2 text-left font-bold text-gray-red transition-colors duration-200 hover:bg-sand"
                    >
                      Edit
                    </Button>
                  )}

                  {onDelete && (
                    <Button
                      variant="bare"
                      type="button"
                      onClick={handleDelete}
                      className="block w-full px-4 py-2 text-left font-bold text-danger transition-colors duration-200 hover:bg-sand"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-2 flex w-full flex-col items-start">
          <div className="flex items-center gap-2">
            <p className="text-[17px]">{formattedRole}</p>
            {user.is_recurring && (
              <span className="rounded-md bg-crimson px-2 py-0.5 text-[11px] font-bold text-light-orange">
                Recurring
              </span>
            )}
          </div>
          {typeof user.visit_count === "number" && (
            <p className="text-[13px] opacity-80">
              {user.visit_count} {user.visit_count === 1 ? "visit" : "visits"}
              {lastVisit ? ` · last ${lastVisit}` : ""}
            </p>
          )}
        </div>

        <address className="flex w-full flex-col items-start gap-1 rounded-sm bg-light-orange p-2 not-italic group">
          {user.email && (
            <div className="flex w-full items-center transition-colors">
              <EmailIcon size={20} className="text-crimson shrink-0" />
              <a
                href={`mailto:${user.email}`}
                className="ml-2 truncate text-[16px]"
              >
                {user.email}
              </a>
            </div>
          )}
          
          {user.phoneNumber && (
            <div className="flex w-full items-center transition-colors">
              <TelephoneIcon size={20} className="text-crimson shrink-0" />
              <a
                href={`tel:${user.phoneNumber}`}
                className="ml-2 truncate text-[16px]"
              >
                {user.phoneNumber}
              </a>
            </div>
          )}
        </address>
      </article>
    </div>
  );
};

export default AS_DirectoryTile;
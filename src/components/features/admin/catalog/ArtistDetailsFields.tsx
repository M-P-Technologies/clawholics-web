import { useState, type ReactNode } from "react";
import { Checkbox, Select } from "@/components/atoms";
import { useArtistRoles } from "@/hooks/admin/useArtistRoles";
import ArtistRolesDialog from "./ArtistRolesDialog";
import ArtistInputField from "./ArtistInputField";

type ArtistDetailsFieldsProps = {
  isEditing: boolean;
  name: string;
  position: string;
  hidePosition: boolean;
  specialty: string;
  bio: string;
  onNameChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onHidePositionChange: (value: boolean) => void;
  onSpecialtyChange: (value: string) => void;
  onBioChange: (value: string) => void;
  /** Shown between Specialty and Bio (the services the artist offers) */
  services: ReactNode;
};

// The artist editor's text details: Name, Position, Specialty, then the services, then Bio.
// A fragment, so each field stays a direct item of the card's column.
const ArtistDetailsFields = ({
  isEditing,
  name,
  position,
  hidePosition,
  specialty,
  bio,
  onNameChange,
  onPositionChange,
  onHidePositionChange,
  onSpecialtyChange,
  onBioChange,
  services,
}: ArtistDetailsFieldsProps) => {
  const { roles } = useArtistRoles();
  const [managingRoles, setManagingRoles] = useState(false);
  // A role since renamed or removed still shows, so the field never reads blank
  const names = roles.map((role) => role.name);
  if (position && roles.length > 0 && !names.includes(position)) names.push(position);

  return (
  <>
    <ArtistInputField
      label="Name"
      value={name}
      onChange={(e) => onNameChange(e.target.value)}
      isEditing={isEditing}
    />

    <div className="relative flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-red">
          Position
        </h3>
        <button type="button" className="text-xs font-medium text-crimson-ink underline" onClick={() => setManagingRoles(true)}>
          Manage roles
        </button>
      </div>


      <Select className="w-full"
          disabled={!isEditing}
          value={position}
          onChange={(e) => onPositionChange(e.target.value)}
        >
          <option value="">Select position</option>

          {names.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      <label className="flex items-center gap-2 text-sm text-gray-red">
        <Checkbox checked={hidePosition} disabled={!isEditing} onChange={(e) => onHidePositionChange(e.target.checked)} />
        Hide this role on the site
      </label>
      <ArtistRolesDialog open={managingRoles} onClose={() => setManagingRoles(false)} />
    </div>

    <ArtistInputField
      label="Specialty"
      value={specialty}
      onChange={(e) => onSpecialtyChange(e.target.value)}
      isEditing={isEditing}
    />

    {services}

    <ArtistInputField
      label="Bio"
      value={bio}
      onChange={(e) => onBioChange(e.target.value)}
      isEditing={isEditing}
    />
  </>
  );
};

export default ArtistDetailsFields;

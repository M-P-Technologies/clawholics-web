import type { ReactNode } from "react";
import { Select } from "@/components/atoms";
import { POSITION_CATEGORIES } from "@/lib/admin/artistEditor";
import ArtistInputField from "./ArtistInputField";

type ArtistDetailsFieldsProps = {
  isEditing: boolean;
  name: string;
  position: string;
  specialty: string;
  bio: string;
  onNameChange: (value: string) => void;
  onPositionChange: (value: string) => void;
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
  specialty,
  bio,
  onNameChange,
  onPositionChange,
  onSpecialtyChange,
  onBioChange,
  services,
}: ArtistDetailsFieldsProps) => (
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
      </div>


      <Select className="w-full"
          disabled={!isEditing}
          value={position}
          onChange={(e) => onPositionChange(e.target.value)}
        >
          <option value="">Select position</option>

          {POSITION_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
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

export default ArtistDetailsFields;

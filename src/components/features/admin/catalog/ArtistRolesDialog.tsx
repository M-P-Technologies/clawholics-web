import { useState } from "react";
import { Button, Checkbox, Input } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { useArtistRoles } from "@/hooks/admin/useArtistRoles";
import type { ArtistRole } from "@/services/nailistService";

type RoleRowProps = {
  role: ArtistRole;
  busy: boolean;
  onSave: (id: number, name: string, isMaster: boolean) => Promise<boolean>;
  onRemove: (id: number) => Promise<boolean>;
};

// One role: its name, whether it charges the master price, and Save / Remove
const RoleRow = ({ role, busy, onSave, onRemove }: RoleRowProps) => {
  const [name, setName] = useState(role.name);
  const [isMaster, setIsMaster] = useState(role.is_master === 1);
  const changed = name.trim() !== role.name || isMaster !== (role.is_master === 1);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-crimson-light/80 p-3">
      <Input aria-label="Role name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-gray-red">
        <Checkbox checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
        Charges the Master Technician price
      </label>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-red">
          {role.artists === 0 ? "No artists" : role.artists === 1 ? "1 artist" : `${role.artists} artists`}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={busy || role.artists > 0} onClick={() => onRemove(role.id)}>
            Remove
          </Button>
          <Button type="button" size="sm" disabled={busy || !changed || !name.trim()} onClick={() => onSave(role.id, name, isMaster)}>
            Save
          </Button>
        </div>
      </div>
    </li>
  );
};

type ArtistRolesDialogProps = { open: boolean; onClose: () => void };

// Admin > Artists > Manage roles: the roles the Position list offers, and which price each charges
const ArtistRolesDialog = ({ open, onClose }: ArtistRolesDialogProps) => {
  const { roles, loading, busy, addRole, saveRole, removeRole } = useArtistRoles();
  const [name, setName] = useState("");
  const [isMaster, setIsMaster] = useState(false);

  const add = async () => {
    if (await addRole(name, isMaster)) {
      setName("");
      setIsMaster(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Manage roles" footer={<Button type="button" onClick={onClose}>Done</Button>}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-red">
          Roles are what the Position list offers. Each one charges either the Master Technician price or the Junior Technician price of a service. A role can be removed once no artist has it.
        </p>
        {loading ? (
          <p className="text-sm text-gray-red">Loading roles…</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {roles.map((role) => (
              <RoleRow key={`${role.id}-${role.name}-${role.is_master}`} role={role} busy={busy} onSave={saveRole} onRemove={removeRole} />
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 border-t border-crimson-light/80 pt-4">
          <h3 className="text-[13px] font-medium text-gray-red">Add a role</h3>
          <Input aria-label="New role name" placeholder="e.g. Senior Technician" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-red">
            <Checkbox checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
            Charges the Master Technician price
          </label>
          <Button type="button" disabled={busy || !name.trim()} onClick={add}>
            Add role
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ArtistRolesDialog;

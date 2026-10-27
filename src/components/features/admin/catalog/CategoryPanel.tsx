import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2 } from "lucide-react";
import {
  ApiError,
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  type Auth,
  type ServiceCategory,
} from "@/services/catalogService";
import { Button, IconButton } from "@/components/atoms";
import { itemName } from "@/lib/itemName";

// `what` says what is being done to which category ("delete Manicure"), for the error if it fails
type Run = (fn: (auth: Auth) => Promise<unknown>, what?: string) => Promise<boolean>;

type Props = {
  categories: ServiceCategory[];
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  onChanged: () => void | Promise<void>;
};

// Inputs and buttons share one height, so every row lines up
const inputClass =
  "h-9 min-w-0 flex-1 bg-milk rounded-md px-3 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson border border-crimson-light";

export default function CategoryPanel({ categories, tokenFetcher, clerkId, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const run: Run = async (action, what = "save that change") => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const token = await tokenFetcher();
      await action({ token, clerkId });
      await onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? `Couldn't ${what}. ${e.message}` : `Couldn't ${what}. Please try again.`);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
      setConfirmId(null);
    }
  };

  const move = (index: number, delta: number) => {
    const ids = categories.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return run((auth) => reorderCategories(ids, auth), `move ${itemName(categories[index].name, "that category")}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-gray-red">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {categories.map((category, index) => (
          <div key={category.id} className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-3">
            {/* The name with its buttons in a row beside it (or, renaming, the field with Save and Cancel under it) */}
            <div className="flex flex-col gap-3">
              {editingId === category.id ? (
                <>
                  <input
                    aria-label={`Rename ${category.name}`}
                    className={`${inputClass} w-full flex-none`}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      disabled={busy || !editingName.trim()}
                      onClick={async () => {
                        const ok = await run((auth) => renameCategory(category.id, editingName.trim(), auth), `rename ${itemName(category.name, "that category")} to ${itemName(editingName, "that name")}`);
                        if (ok) setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 wrap-break-word text-base font-bold text-gray-red">{category.name}</p>
                  <div className="flex shrink-0 items-center gap-0">
                    <IconButton size="sm" icon={ArrowUp} label={`Move ${category.name} up`} disabled={busy || index === 0} onClick={() => move(index, -1)} />
                    <IconButton size="sm" icon={ArrowDown} label={`Move ${category.name} down`} disabled={busy || index === categories.length - 1} onClick={() => move(index, 1)} />
                    <IconButton
                      size="sm"
                      icon={Pencil}
                      label={`Rename category ${category.name}`}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    />
                    {confirmId === category.id ? (
                      <IconButton
                        size="sm"
                        icon={Check}
                        label={`Confirm delete ${category.name}`}
                        disabled={busy}
                        className="text-danger-ink"
                        onClick={() => run((auth) => deleteCategory(category.id, auth), `delete ${itemName(category.name, "that category")}`)}
                      />
                    ) : (
                      <IconButton size="sm" icon={Trash2} label={`Delete ${category.name}`} disabled={busy} onClick={() => setConfirmId(category.id)} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          aria-label="New category name"
          placeholder="New category name"
          className={inputClass}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          type="button"
          disabled={busy || !newName.trim()}
          onClick={async () => {
            const ok = await run((auth) => createCategory(newName.trim(), auth), `add ${itemName(newName, "that category")}`);
            if (ok) setNewName("");
          }}
        >
          Add category
        </Button>
      </div>
    </div>
  );
}

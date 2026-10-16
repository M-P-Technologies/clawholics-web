import { useRef, useState } from "react";
import {
  ApiError,
  createAddon,
  createCategory,
  deleteAddon,
  deleteCategory,
  renameCategory,
  reorderCategories,
  updateAddon,
  type Auth,
  type ServiceAddon,
  type ServiceCategory,
} from "@/services/catalogService";
import { Button } from "@/components/atoms";

type Run = (fn: (auth: Auth) => Promise<unknown>) => Promise<boolean>;

type Props = {
  categories: ServiceCategory[];
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  onChanged: () => void | Promise<void>;
};

// Inputs and buttons share one height, so every row lines up
const inputClass =
  "h-9 min-w-0 flex-1 bg-milk rounded-md px-3 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson border border-crimson-light";

function AddonRow({ addon, run, busy }: { addon: ServiceAddon; run: Run; busy: boolean }) {
  const [name, setName] = useState(addon.name);
  const [price, setPrice] = useState(String(addon.price));
  const dirty = name !== addon.name || price !== String(addon.price);
  const valid = name.trim() !== "" && price !== "";

  return (
    <div className="flex items-center gap-3">
      <input aria-label={`Add-on name ${addon.name}`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      <input
        aria-label={`Add-on price ${addon.name}`}
        className={`${inputClass} max-w-27.5 flex-none`}
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
      />
      <Button
        size="sm"
        variant="secondary"
        type="button"
        disabled={busy || !dirty || !valid}
        onClick={() => run((auth) => updateAddon(addon.id, name.trim(), Number(price), auth))}
      >
        Save
      </Button>
      <Button
        size="sm"
        variant="secondary"
        type="button"
        aria-label={`Remove add-on ${addon.name}`}
        disabled={busy}
        onClick={() => run((auth) => deleteAddon(addon.id, auth))}
      >
        Remove
      </Button>
    </div>
  );
}

function NewAddon({ category, run, busy }: { category: ServiceCategory; run: Run; busy: boolean }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const add = async () => {
    const ok = await run((auth) => createAddon(category.id, name.trim(), Number(price), auth));
    if (ok) {
      setName("");
      setPrice("");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        aria-label={`New add-on name for ${category.name}`}
        placeholder="Add-on name"
        className={inputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        aria-label={`New add-on price for ${category.name}`}
        placeholder="Price"
        inputMode="numeric"
        className={`${inputClass} max-w-27.5 flex-none`}
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
      />
      <Button
        size="sm"
        variant="secondary"
        type="button"
        aria-label={`Add add-on to ${category.name}`}
        disabled={busy || !name.trim() || price === ""}
        onClick={add}
      >
        Add
      </Button>
    </div>
  );
}

export default function CategoryPanel({ categories, tokenFetcher, clerkId, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const run: Run = async (action) => {
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
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
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
    return run((auth) => reorderCategories(ids, auth));
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
            {/* The name (or its rename field) on top, its buttons in a row under it */}
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
                        const ok = await run((auth) => renameCategory(category.id, editingName.trim(), auth));
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
                <>
                  <p className="min-w-0 wrap-break-word text-base font-bold text-gray-red">{category.name}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      aria-label={`Move ${category.name} up`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      aria-label={`Move ${category.name} down`}
                      disabled={busy || index === categories.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"

                      aria-label={`Rename category ${category.name}`}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    >
                      Rename
                    </Button>
                    {confirmId === category.id ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        aria-label={`Confirm delete ${category.name}`}
                        disabled={busy}
                        onClick={() => run((auth) => deleteCategory(category.id, auth))}
                      >
                        Confirm?
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        aria-label={`Delete ${category.name}`}
                        disabled={busy}
                        onClick={() => setConfirmId(category.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-crimson/20 pt-2">
              <p className="text-sm text-gray-red">Add-ons offered with every service in this category</p>
              {category.addons.map((addon) => (
                <AddonRow key={`${addon.id}-${addon.name}-${addon.price}`} addon={addon} run={run} busy={busy} />
              ))}
              <NewAddon category={category} run={run} busy={busy} />
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
            const ok = await run((auth) => createCategory(newName.trim(), auth));
            if (ok) setNewName("");
          }}
        >
          Add category
        </Button>
      </div>
    </div>
  );
}

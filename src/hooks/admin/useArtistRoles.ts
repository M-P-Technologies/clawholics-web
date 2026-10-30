"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { ADMIN } from "@/lib/adminQueries";
import {
  createArtistRole,
  deleteArtistRole,
  fetchArtistRoles,
  updateArtistRole,
  type ArtistRole,
} from "@/services/nailistService";

const rolesKey = [ADMIN, "artistRoles"] as const;

// The artist roles (Master Technician, Junior Technician, whatever the admin adds), shared by the
// artist cards' Position lists and the Manage roles window. A change refreshes the artists, since
// they carry their role's name and price tier.
export function useArtistRoles() {
  const { getToken } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const query = useQuery({ queryKey: rolesKey, queryFn: async () => fetchArtistRoles(await getToken()) });
  const roles: ArtistRole[] = query.data ?? [];

  const run = async (work: (token: string | null) => Promise<ArtistRole[]>, done: string) => {
    setBusy(true);
    try {
      queryClient.setQueryData(rolesKey, await work(await getToken()));
      queryClient.invalidateQueries({ queryKey: [ADMIN, "nailists"] });
      queryClient.invalidateQueries({ queryKey: ["public"] });
      toast.show("success", done, "Artists with this role use it from now on.");
      return true;
    } catch (error) {
      toast.show("error", "Couldn't save the role", error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    roles,
    loading: query.isLoading,
    busy,
    addRole: (name: string, isMaster: boolean) => run((token) => createArtistRole(name, isMaster, token), "Role added"),
    saveRole: (id: number, name: string, isMaster: boolean) => run((token) => updateArtistRole(id, name, isMaster, token), "Role saved"),
    removeRole: (id: number) => run((token) => deleteArtistRole(id, token), "Role removed"),
  };
}

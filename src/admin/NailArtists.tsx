"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import NailArtistDropdown from "../components/admin/NailArtistDropdown";
import { fetchNailists, type Nailist } from "../services/nailistService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "../components/ui/ToastProvider";

export default function NailArtists() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [nailists, setNailists] = useState<Nailist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNailists = async () => {
    const data = await fetchNailists();
    setNailists(data);
  };
  
  useEffect(() => {
    const loadInitialNailists = async () => {
      try {
        await loadNailists();
      } catch (error) {
        console.error("Failed to fetch artists:", error);
        toast.show("error", "Couldn't load the artists", "We couldn't load the artist list. Please refresh the page to try again.");
      } finally {
        setIsLoading(false);
      }
    };
  
    loadInitialNailists();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading artists" />
      </div>
    );
  }

  return (
    <AdminShell title="Artists">

        <div className="flex-1 overflow-y-auto pb-2">
            <div className="flex flex-col gap-4">
              {nailists.map((nailist) => (
                <NailArtistDropdown
                  key={nailist.id}
                  nailist={nailist}
                  tokenFetcher={getToken}
                  clerkId={currentUser?.id}
                  onNailistUpdated={async () => {
                    try {
                      await loadNailists();
                    } catch (error) {
                      console.error("Failed to refresh artists:", error);
                      toast.show("info", "Saved, but the list is out of date", "Your changes were saved. We couldn't refresh the list, so please reload the page to see them.");
                    }
                  }}
                  onNailistDeleted={(nailistId) =>
                    setNailists((prev) =>
                      prev.filter((item) => item.id !== nailistId)
                    )
                  }
                />
              ))}

              <NailArtistDropdown
                mode="create"
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
                onNailistCreated={async () => {
                  try {
                    await loadNailists();
                  } catch (error) {
                    console.error("Failed to refresh artists:", error);
                    toast.show("info", "Created, but the list is out of date", "The artist was created. We couldn't refresh the list, so please reload the page to see them.");
                  }
                }}
              />
            </div>
        </div>
      
    </AdminShell>
  );
}
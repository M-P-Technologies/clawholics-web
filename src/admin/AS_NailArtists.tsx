"use client";

import { useEffect, useState } from "react";
import AS_SideBar from "../components/admin/AS_SideBar";
import AS_NailArtistDropdown from "../components/admin/AS_NailArtistDropdown";
import { fetchNailists, type Nailist } from "../services/nailistService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "../components/ui/ToastProvider";

export default function AS_NailArtists() {
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
    <div className="flex min-h-screen lg:h-screen px-2 py-2 sm:px-4 sm:py-4 bg-light-orange overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex flex-wrap justify-between items-center gap-4 w-full">
            <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
              Artists
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
            <div className="flex flex-col gap-4">
              {nailists.map((nailist) => (
                <AS_NailArtistDropdown
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

              <AS_NailArtistDropdown
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
      </div>
    </div>
  );
}
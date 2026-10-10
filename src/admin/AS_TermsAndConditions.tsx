"use client";

import { useEffect, useState } from "react";
import AS_SideBar from "../components/admin/AS_SideBar";
import AS_TACDropdown from "../components/admin/AS_TACDropdown";
import SortableList from "../components/admin/SortableList";
import { fetchTacs, updateTac, type Tac } from "../services/tacService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";

const AS_TermsAndConditions = () => {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [tacs, setTacs] = useState<Tac[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sortTacs = (items: Tac[]) =>
    [...items].sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  const loadTacs = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchTacs();
      setTacs(sortTacs(data));
    } catch (err: any) {
      console.error("Failed to fetch TACs:", err);
      setError(err.message || "Failed to load Terms & Conditions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTacs();
  }, []);

  const handleTacUpdated = (updatedTac: Tac) => {
    setTacs((prev) =>
      sortTacs(prev.map((t) => (t.id === updatedTac.id ? updatedTac : t)))
    );
  };

  const handleTacCreated = (createdTac: Tac) => {
    setTacs((prev) => sortTacs([...prev, createdTac]));
  };

  const handleTacDeleted = (tacId: number) => {
    setTacs((prev) => prev.filter((t) => t.id !== tacId));
  };

  const handleReorder = async (reorderedItems: Tac[]) => {
    const withUpdatedDisplayOrder = reorderedItems.map((item, index) => ({
      ...item,
      display_order: index + 1,
    }));

    setTacs(withUpdatedDisplayOrder);

    try {
      const token = await getToken();
      await Promise.all(
        withUpdatedDisplayOrder.map((item) =>
          updateTac(item.id, item.section, item.content, item.display_order, token, currentUser?.id)
        )
      );
    } catch (err) {
      console.error("Failed to reorder:", err);
      loadTacs();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading terms and conditions" />
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
              Terms & Conditions
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
          {error ? (
            <p className="text-[18px]">{error}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {tacs.length === 0 ? (
                <p className="text-[18px]">No entries found.</p>
              ) : (
                <SortableList
                  items={tacs}
                  getItemId={(item) => item.id}
                  onReorder={handleReorder}
                  className="flex flex-col gap-4"
                  renderItem={(tac, { dragHandleProps, isDragging }) => (
                    <AS_TACDropdown
                      tac={tac}
                      onTacUpdated={handleTacUpdated}
                      onTacDeleted={handleTacDeleted}
                      dragHandleProps={dragHandleProps}
                      isDragging={isDragging}
                      tokenFetcher={getToken}
                      clerkId={currentUser?.id}
                    />
                  )}
                  renderOverlay={(tac) => (
                    <AS_TACDropdown tac={tac} isDragOverlay />
                  )}
                />
              )}

              <AS_TACDropdown
                mode="create"
                tac={{
                  id: 0,
                  section: "",
                  content: "",
                  display_order: tacs.length + 1,
                }}
                onTacCreated={handleTacCreated}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AS_TermsAndConditions;
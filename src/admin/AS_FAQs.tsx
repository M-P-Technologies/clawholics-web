"use client";

import { useEffect, useState } from "react";
import AS_SideBar from "../components/admin/AS_SideBar";
import AS_Dropdown from "../components/admin/AS_FAQDropdown";
import SortableList from "../components/admin/SortableList";
import { fetchFaqs, updateFaq, type Faq } from "../services/faqService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";

const AS_FAQs = () => {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sortFaqs = (items: Faq[]) =>
    [...items].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id - b.id
    );

  const loadFaqs = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchFaqs();
      setFaqs(sortFaqs(data));
    } catch (err: any) {
      console.error("Failed to fetch FAQs:", err);
      setError(err.message || "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleFaqUpdated = (updatedFaq: Faq) => {
    setFaqs((prevFaqs) =>
      sortFaqs(
        prevFaqs.map((faq) => (faq.id === updatedFaq.id ? updatedFaq : faq))
      )
    );
  };

  const handleFaqCreated = (createdFaq: Faq) => {
    setFaqs((prevFaqs) => sortFaqs([...prevFaqs, createdFaq]));
  };

  const handleFaqDeleted = (faqId: number) => {
    setFaqs((prevFaqs) => prevFaqs.filter((faq) => faq.id !== faqId));
  };

  const handleReorder = async (reorderedItems: Faq[]) => {
    const withUpdatedDisplayOrder = reorderedItems.map((item, index) => ({
      ...item,
      display_order: index + 1,
    }));

    setFaqs(withUpdatedDisplayOrder);

    try {
      const token = await getToken();
      await Promise.all(
        withUpdatedDisplayOrder.map((item) =>
          updateFaq(item.id, item.question, item.answer, item.display_order, token, currentUser?.id)
        )
      );
    } catch (err) {
      console.error("Failed to reorder FAQs:", err);
      loadFaqs();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading FAQs" />
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
              Frequently Asked Questions
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
          {error ? (
            <p className="text-[18px]">{error}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {faqs.length === 0 ? (
                <p className="text-[18px]">No FAQs found.</p>
              ) : (
                <SortableList
                  items={faqs}
                  getItemId={(item) => item.id}
                  onReorder={handleReorder}
                  className="flex flex-col gap-4"
                  renderItem={(faq, { dragHandleProps, isDragging }) => (
                    <AS_Dropdown
                      faq={faq}
                      onFaqUpdated={handleFaqUpdated}
                      onFaqDeleted={handleFaqDeleted}
                      dragHandleProps={dragHandleProps}
                      isDragging={isDragging}
                      tokenFetcher={getToken}
                      clerkId={currentUser?.id}
                    />
                  )}
                  renderOverlay={(faq) => (
                    <AS_Dropdown faq={faq} isDragOverlay />
                  )}
                />
              )}

              <AS_Dropdown
                mode="create"
                faq={{
                  id: 0,
                  question: "",
                  answer: "",
                  display_order: faqs.length + 1,
                }}
                onFaqCreated={handleFaqCreated}
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

export default AS_FAQs;
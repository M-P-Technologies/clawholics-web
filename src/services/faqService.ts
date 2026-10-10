export type Faq = {
  id: number;
  question: string;
  answer: string;
  display_order: number;
};

import { API_BASE_URL } from "../apiConfig";

const getHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (clerkId) headers["clerk_id"] = clerkId;
  return headers;
};

export const fetchFaqs = async (): Promise<Faq[]> => {
  const res = await fetch(`${API_BASE_URL}/faqs?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch FAQs");
  }

  return res.json();
};

export const createFaq = async (
  question: string,
  answer: string,
  display_order: number,
  token?: string | null,
  clerkId?: string | null
): Promise<Faq> => {
  const res = await fetch(`${API_BASE_URL}/faqs`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ question, answer, display_order }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to create FAQ");
  }

  return data;
};

export const updateFaq = async (
  id: number,
  question: string,
  answer: string,
  display_order: number,
  token?: string | null,
  clerkId?: string | null
): Promise<Faq> => {
  const res = await fetch(`${API_BASE_URL}/faqs/${id}`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ question, answer, display_order }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to update FAQ");
  }

  return data;
};

export const deleteFaq = async (id: number, token?: string | null, clerkId?: string | null): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/faqs/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    const errorText = await res.text();
    throw new Error(errorText || "Failed to delete FAQ");
  }
};

// ADMIN ONLY. Private notes must never reach a client-facing page: do not
// import this file from anything under pages/ or from a non-admin service.
import { ApiError, call, type Auth } from "./catalogService";

export interface ClientNote {
  id: number;
  client_user_id: number;
  author_admin_id: number;
  author_name?: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ClientNextSteps {
  client_user_id: number;
  text: string;
  updated_by?: number | null;
  updated_at?: string | null;
}

const base = (clientUserId: number) => `/clients/${clientUserId}`;

export const isNotesApiUnavailable = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 404;

export const fetchNotes = (clientUserId: number, auth: Auth): Promise<ClientNote[]> =>
  call<ClientNote[]>(`${base(clientUserId)}/notes`, { method: "GET" }, auth);

export const addNote = (clientUserId: number, note: string, auth: Auth): Promise<ClientNote> =>
  call<ClientNote>(`${base(clientUserId)}/notes`, { method: "POST", body: JSON.stringify({ note }) }, auth);

export const updateNote = (
  clientUserId: number,
  noteId: number,
  note: string,
  auth: Auth,
): Promise<ClientNote> =>
  call<ClientNote>(
    `${base(clientUserId)}/notes/${noteId}`,
    { method: "PUT", body: JSON.stringify({ note }) },
    auth,
  );

export const deleteNote = (clientUserId: number, noteId: number, auth: Auth): Promise<void> =>
  call<void>(`${base(clientUserId)}/notes/${noteId}`, { method: "DELETE" }, auth);

export const fetchNextSteps = (clientUserId: number, auth: Auth): Promise<ClientNextSteps> =>
  call<ClientNextSteps>(`${base(clientUserId)}/next-steps`, { method: "GET" }, auth);

export const saveNextSteps = (
  clientUserId: number,
  text: string,
  auth: Auth,
): Promise<ClientNextSteps> =>
  call<ClientNextSteps>(
    `${base(clientUserId)}/next-steps`,
    { method: "PUT", body: JSON.stringify({ text }) },
    auth,
  );

import "server-only";
import { after } from "next/server";

// Small helpers shared by the ported route handlers.

/** The Worker's readBody: the JSON body, or {} when there is none or it doesn't parse. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** The Worker's notFound() response. */
export const routeNotFound = () => Response.json({ message: "Route not found" }, { status: 404 });

/** Positive Postgres `integer` id, or null (non-numeric or out of range). */
export function toId(value: unknown): number | null {
  const id = typeof value === "string" && !/^\d+$/.test(value.trim()) ? NaN : Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

/** Work that runs after the response is sent (the Worker's ctx.waitUntil), e.g. emails. */
export function inBackground(label: string, task: () => Promise<unknown>) {
  after(() => task().catch((error) => console.error(`[${label}]`, error)));
}

/** postgres.js refuses `undefined` parameters; the Worker's D1 bound them as NULL. */
export const orNull = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

/** The SQLSTATE of a Postgres error (e.g. 23505 unique violation), or undefined. */
export const pgErrorCode = (error: unknown) =>
  typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;

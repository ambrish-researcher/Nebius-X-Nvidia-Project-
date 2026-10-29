import { useLab } from "./store";
import { visualFixture } from "./visual-fixtures";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (path === "ai" && useLab.getState().visualPreview)
    return visualFixture(body) as T;
  const token =
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("lab-access-token") || "";
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Lab-Token": token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(100_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed (${res.status}). Check the service and retry.`,
    );
  }
  return res.json();
}
export function formatError(e: unknown) {
  return e instanceof Error ? e.message : "The request could not be completed.";
}

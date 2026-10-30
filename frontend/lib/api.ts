import { useLab } from "./store";
import { visualFixture } from "./visual-fixtures";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const RETRYABLE = new Set([502, 503, 504]);

/**
 * Retry read-only requests during transient backend restarts.
 * NEVER retry a POST automatically: AI inference may have been billed even
 * when the proxy did not receive its response.
 */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (path === "ai" && useLab.getState().visualPreview)
    return visualFixture(body) as T;

  const token =
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("lab-access-token") || "";
  const readOnly = body === undefined;
  const attempts = readOnly ? 3 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`/api/${path}`, {
        method: readOnly ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Lab-Token": token } : {}),
        },
        ...(readOnly ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(readOnly ? 25_000 : 100_000),
        cache: "no-store",
      });

      if (res.ok) return (await res.json()) as T;

      if (readOnly && RETRYABLE.has(res.status) && attempt < attempts - 1) {
        await wait(750 * 2 ** attempt);
        continue;
      }

      const data: unknown = await res.json().catch(() => ({}));
      const detail =
        data && typeof data === "object" && "detail" in data &&
        typeof data.detail === "string"
          ? data.detail
          : null;
      if (RETRYABLE.has(res.status)) {
        throw new Error(
          readOnly
            ? "Engineering service is temporarily unavailable. Your project remains in the browser; retry when the backend is ready."
            : "Engineering service did not confirm this request. Check the existing generation status before submitting again to avoid duplicate AI charges.",
        );
      }
      throw new Error(detail || `Request failed (HTTP ${res.status}).`);
    } catch (error) {
      const transient =
        error instanceof TypeError ||
        (error instanceof DOMException && error.name === "TimeoutError");
      if (readOnly && transient && attempt < attempts - 1) {
        await wait(750 * 2 ** attempt);
        continue;
      }
      if (transient) {
        throw new Error(
          readOnly
            ? "Cannot reach the engineering service right now. Retry when the backend is available."
            : "Connection interrupted; generation outcome is unknown. Check request status before trying again.",
        );
      }
      throw error;
    }
  }
  throw new Error("Engineering service unavailable after safe retries.");
}

export function formatError(e: unknown) {
  return e instanceof Error ? e.message : "The request could not be completed.";
}

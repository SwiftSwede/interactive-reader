import type { EvalView } from "@/lib/evaluacion/view";
import type { Opener } from "@/lib/evaluacion/types";

export class EvalRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const FALLBACK = "Algo salió mal. Intenta de nuevo.";

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("evaluacion request failed", path, error);
    throw new EvalRequestError("Revisa tu conexión e intenta de nuevo.", 0);
  }
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !json) {
    console.error("evaluacion request error", path, response.status);
    throw new EvalRequestError(json?.error ?? FALLBACK, response.status);
  }
  return json;
}

export const evalApi = {
  state: () => request<{ view: EvalView | null }>("/api/evaluacion/state"),
  start: (opener: Opener) => request<{ view: EvalView }>("/api/evaluacion/start", { opener }),
  answer: (itemId: string, optionId: string) =>
    request<{ view: EvalView }>("/api/evaluacion/answer", { itemId, optionId }),
  email: (email: string, website: string) =>
    request<{ ok: true }>("/api/evaluacion/email", { email, website }),
};

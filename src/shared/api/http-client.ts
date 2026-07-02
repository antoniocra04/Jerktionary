import { getBackendHttpUrl } from "@/features/settings/store/settings-store";
import type { ApiErrorDto } from "@/shared/types/backend";

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  signal?: AbortSignal;
};

type JsonRequestInit<TBody> = Omit<RequestInit, "body"> &
  RequestOptions & {
    body?: TBody;
  };

export async function requestJson<TResponse, TBody = unknown>(
  path: string,
  init: JsonRequestInit<TBody> = {}
): Promise<TResponse> {
  const { body, ...requestOptions } = init;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const requestInit: RequestInit = {
    ...requestOptions,
    headers
  };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${getBackendHttpUrl()}${path}`, requestInit);
  } catch (error) {
    const message =
      error instanceof TypeError
        ? "Backend недоступен или CORS не разрешает dev origin. Проверьте backend и CORS."
        : "Не удалось выполнить HTTP-запрос";
    throw new HttpError(message, 0);
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new HttpError(
      payload?.message ?? `HTTP ${response.status}`,
      response.status,
      payload?.code,
      payload?.details
    );
  }

  return response.json() as Promise<TResponse>;
}

async function readErrorPayload(response: Response): Promise<ApiErrorDto | null> {
  try {
    return (await response.json()) as ApiErrorDto;
  } catch {
    return null;
  }
}

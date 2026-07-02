export type HealthDto = {
  status: "ok" | string;
  version: string;
};

export type BackendComponentDto = {
  ready: boolean;
  required: boolean;
  details: string;
};

export type ReadyDto = {
  ready: boolean;
  components: Record<string, BackendComponentDto>;
};

export type BackendComponent = BackendComponentDto & {
  name: string;
};

export type ReadyStatus = {
  ready: boolean;
  components: BackendComponent[];
};

export type BackendDocsDto = {
  swagger_url: string;
  openapi_url: string;
  redoc_url: string;
  websocket_docs_url: string;
};

export type ApiErrorCode =
  | "LLM_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "LLM_BAD_RESPONSE"
  | "INTERNAL_ERROR"
  | string;

export type ApiErrorDto = {
  code: ApiErrorCode;
  message: string;
  details: Record<string, unknown>;
};

const fallbackHttpUrl = "http://127.0.0.1:8000";
const fallbackWsUrl = "ws://127.0.0.1:8000/ws/audio";
const fallbackSwaggerUrl = "http://127.0.0.1:8000/docs";

export const appConfig = {
  backendHttpUrl: import.meta.env.VITE_BACKEND_HTTP_URL ?? fallbackHttpUrl,
  backendWsUrl: import.meta.env.VITE_BACKEND_WS_URL ?? fallbackWsUrl,
  backendSwaggerUrl: import.meta.env.VITE_BACKEND_SWAGGER_URL ?? fallbackSwaggerUrl
} as const;

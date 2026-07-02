type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, details?: unknown): void {
  const payload = details === undefined ? "" : details;
  console[level](`[jerktionary] ${message}`, payload);
}

export const logger = {
  info: (message: string, details?: unknown) => log("info", message, details),
  warn: (message: string, details?: unknown) => log("warn", message, details),
  error: (message: string, details?: unknown) => log("error", message, details)
};

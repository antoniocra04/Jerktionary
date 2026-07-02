import type { TranscriptTerm } from "@/shared/types/term";
import type { BackendWsEvent, WsConnectionStatus } from "@/shared/types/transcript";

type TranscriptWsClientOptions = {
  url: string;
  onEvent: (event: BackendWsEvent) => void;
  onStatus: (status: WsConnectionStatus) => void;
  onError: (message: string) => void;
  reconnect?: boolean;
};

export class TranscriptWsClient {
  private readonly options: TranscriptWsClientOptions;
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;

  constructor(options: TranscriptWsClientOptions) {
    this.options = options;
  }

  connect(): void {
    this.clearReconnectTimer();
    this.manuallyClosed = false;
    this.options.onStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    this.socket = new WebSocket(this.options.url);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.options.onStatus("connected");
    };

    this.socket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        this.options.onError("Backend прислал не-JSON WebSocket сообщение");
        return;
      }

      const event = parseWsEvent(message.data);
      if (event === null) {
        this.options.onError("Backend прислал неизвестное WebSocket событие");
        return;
      }

      this.options.onEvent(event);
    };

    this.socket.onerror = () => {
      this.options.onStatus("error");
      this.options.onError("Ошибка WebSocket соединения");
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (this.manuallyClosed) {
        this.options.onStatus("disconnected");
        return;
      }

      if (this.options.reconnect ?? true) {
        this.scheduleReconnect();
      } else {
        this.options.onStatus("disconnected");
      }
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.socket?.close(1000, "listening stopped");
    this.socket = null;
    this.options.onStatus("disconnected");
  }

  sendAudioChunk(chunk: ArrayBuffer): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(chunk);
    return true;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    this.options.onStatus("reconnecting");
    const delay = Math.min(500 * 2 ** (this.reconnectAttempt - 1), 5000);
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function parseWsEvent(raw: string): BackendWsEvent | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || typeof value.type !== "string") {
      return null;
    }

    if (value.type === "transcript_update" && typeof value.text === "string") {
      return {
        type: "transcript_update",
        text: value.text,
        is_final: Boolean(value.is_final),
        terms: Array.isArray(value.terms) ? value.terms.filter(isTranscriptTerm) : []
      };
    }

    if (value.type === "terms_update") {
      return {
        type: "terms_update",
        items: Array.isArray(value.items) ? value.items.filter(isTranscriptTerm) : []
      };
    }

    if (value.type === "error" && typeof value.code === "string") {
      return {
        type: "error",
        code: value.code
      };
    }

    return null;
  } catch {
    return null;
  }
}

function isTranscriptTerm(value: unknown): value is TranscriptTerm {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    typeof value.normalized === "string" &&
    typeof value.start === "number" &&
    typeof value.end === "number" &&
    typeof value.type === "string" &&
    typeof value.confidence === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import { create } from "zustand";
import { appConfig } from "@/shared/config/app-config";

const HTTP_KEY = "settings.backendHttpUrl";
const NAME_KEY = "settings.displayName";
const ABOUT_ME_KEY = "settings.aboutMe";
const AUDIO_SOURCE_KEY = "settings.audioSource";
const AUDIO_INPUT_DEVICE_KEY = "settings.audioInputDeviceId";
const WHISPER_PROVIDER_KEY = "settings.whisperProvider";
const WHISPER_SERVICE_KEY = "settings.whisperService";
const WHISPER_API_KEY = "settings.whisperApiKey";
const WHISPER_MODEL_KEY = "settings.whisperModel";
const WHISPER_BASE_URL_KEY = "settings.whisperBaseUrl";
const LLM_PROVIDER_KEY = "settings.llmProvider";
const LLM_SERVICE_KEY = "settings.llmService";
const LLM_API_KEY = "settings.llmApiKey";
const LLM_MODEL_KEY = "settings.llmModel";
const LLM_BASE_URL_KEY = "settings.llmBaseUrl";

export const DEFAULT_DISPLAY_NAME = "Jerktionary";
export type AudioSource = "microphone" | "system";
export type ModelProvider = "local" | "api";

export type LlmService =
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "custom";

export type AsrService = "openai" | "groq" | "custom";

type ServicePreset = {
  label: string;
  baseUrl: string;
  model: string;
};

/** Hosted LLM presets. All except Anthropic speak OpenAI-compatible chat
 * completions; Anthropic uses its native Messages API on the backend. Model is a
 * default the user can override in settings. */
export const LLM_SERVICE_PRESETS: Record<LlmService, ServicePreset> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: {
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    model: "claude-haiku-4-5"
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash"
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile"
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini"
  },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  custom: { label: "Свой (OpenAI-совместимый)", baseUrl: "", model: "" }
};

/** Hosted transcription presets (OpenAI-compatible /audio/transcriptions). */
export const ASR_SERVICE_PRESETS: Record<AsrService, ServicePreset> = {
  openai: { label: "OpenAI Whisper", baseUrl: "https://api.openai.com/v1", model: "whisper-1" },
  groq: {
    label: "Groq Whisper",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "whisper-large-v3-turbo"
  },
  custom: { label: "Свой (OpenAI-совместимый)", baseUrl: "", model: "" }
};

export type ModelApiSettings = {
  provider: ModelProvider;
  service?: string;
  api_key?: string;
  model?: string;
  base_url?: string;
};

export type BackendModelSettings = {
  whisper: ModelApiSettings;
  llm: ModelApiSettings;
};

function normalizeHttpUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function readInitial(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readAudioSource(): AudioSource {
  const value = readInitial(AUDIO_SOURCE_KEY, "microphone");
  return value === "system" ? "system" : "microphone";
}

function readModelProvider(key: string): ModelProvider {
  return readInitial(key, "local") === "api" ? "api" : "local";
}

function readLlmService(): LlmService {
  const value = readInitial(LLM_SERVICE_KEY, "openai");
  return value in LLM_SERVICE_PRESETS ? (value as LlmService) : "openai";
}

function readAsrService(): AsrService {
  const value = readInitial(WHISPER_SERVICE_KEY, "openai");
  return value in ASR_SERVICE_PRESETS ? (value as AsrService) : "openai";
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}

export type ModelSettingsInput = {
  whisperProvider: ModelProvider;
  whisperService: AsrService;
  whisperApiKey: string;
  whisperModel: string;
  whisperBaseUrl: string;
  llmProvider: ModelProvider;
  llmService: LlmService;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
};

type SettingsState = {
  backendHttpUrl: string;
  displayName: string;
  /** Persistent "about me": role, stack, experience — personalizes live answers. */
  aboutMe: string;
  audioSource: AudioSource;
  /** Preferred microphone deviceId; empty string means the system default. */
  audioInputDeviceId: string;
  whisperProvider: ModelProvider;
  whisperService: AsrService;
  whisperApiKey: string;
  whisperModel: string;
  whisperBaseUrl: string;
  llmProvider: ModelProvider;
  llmService: LlmService;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  setBackendHttpUrl: (url: string) => void;
  setDisplayName: (name: string) => void;
  setAboutMe: (aboutMe: string) => void;
  setAudioSource: (source: AudioSource) => void;
  setAudioInputDeviceId: (deviceId: string) => void;
  setModelSettings: (settings: ModelSettingsInput) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  backendHttpUrl: normalizeHttpUrl(readInitial(HTTP_KEY, appConfig.backendHttpUrl)),
  displayName: readInitial(NAME_KEY, DEFAULT_DISPLAY_NAME),
  aboutMe: readInitial(ABOUT_ME_KEY, ""),
  audioSource: readAudioSource(),
  audioInputDeviceId: readInitial(AUDIO_INPUT_DEVICE_KEY, ""),
  whisperProvider: readModelProvider(WHISPER_PROVIDER_KEY),
  whisperService: readAsrService(),
  whisperApiKey: readInitial(WHISPER_API_KEY, ""),
  whisperModel: readInitial(WHISPER_MODEL_KEY, ""),
  whisperBaseUrl: readInitial(WHISPER_BASE_URL_KEY, ""),
  llmProvider: readModelProvider(LLM_PROVIDER_KEY),
  llmService: readLlmService(),
  llmApiKey: readInitial(LLM_API_KEY, ""),
  llmModel: readInitial(LLM_MODEL_KEY, ""),
  llmBaseUrl: readInitial(LLM_BASE_URL_KEY, ""),
  setBackendHttpUrl: (url) => {
    const normalized = normalizeHttpUrl(url) || appConfig.backendHttpUrl;
    writeSetting(HTTP_KEY, normalized);
    set({ backendHttpUrl: normalized });
  },
  setDisplayName: (name) => {
    const value = name.trim() || DEFAULT_DISPLAY_NAME;
    writeSetting(NAME_KEY, value);
    set({ displayName: value });
  },
  setAboutMe: (aboutMe) => {
    const value = aboutMe.trim();
    writeSetting(ABOUT_ME_KEY, value);
    set({ aboutMe: value });
  },
  setAudioSource: (audioSource) => {
    writeSetting(AUDIO_SOURCE_KEY, audioSource);
    set({ audioSource });
  },
  setAudioInputDeviceId: (audioInputDeviceId) => {
    writeSetting(AUDIO_INPUT_DEVICE_KEY, audioInputDeviceId);
    set({ audioInputDeviceId });
  },
  setModelSettings: (settings) => {
    const next = {
      whisperProvider: settings.whisperProvider,
      whisperService: settings.whisperService,
      whisperApiKey: settings.whisperApiKey.trim(),
      whisperModel: settings.whisperModel.trim(),
      whisperBaseUrl: settings.whisperBaseUrl.trim(),
      llmProvider: settings.llmProvider,
      llmService: settings.llmService,
      llmApiKey: settings.llmApiKey.trim(),
      llmModel: settings.llmModel.trim(),
      llmBaseUrl: settings.llmBaseUrl.trim()
    };
    writeSetting(WHISPER_PROVIDER_KEY, next.whisperProvider);
    writeSetting(WHISPER_SERVICE_KEY, next.whisperService);
    writeSetting(WHISPER_API_KEY, next.whisperApiKey);
    writeSetting(WHISPER_MODEL_KEY, next.whisperModel);
    writeSetting(WHISPER_BASE_URL_KEY, next.whisperBaseUrl);
    writeSetting(LLM_PROVIDER_KEY, next.llmProvider);
    writeSetting(LLM_SERVICE_KEY, next.llmService);
    writeSetting(LLM_API_KEY, next.llmApiKey);
    writeSetting(LLM_MODEL_KEY, next.llmModel);
    writeSetting(LLM_BASE_URL_KEY, next.llmBaseUrl);
    set(next);
  }
}));

/** Non-reactive accessors for use outside React (fetch/WebSocket clients). */
export function getBackendHttpUrl(): string {
  return useSettingsStore.getState().backendHttpUrl;
}

export function getBackendWsUrl(): string {
  // No query params here on purpose: provider config travels as the first WS
  // message, and putting an API key into the URL leaks it into server logs.
  return `${getBackendHttpUrl().replace(/^http/i, "ws")}/ws/audio`;
}

export function getBackendSwaggerUrl(): string {
  return `${getBackendHttpUrl()}/docs`;
}

export function getBackendModelSettings(): BackendModelSettings {
  const state = useSettingsStore.getState();
  return {
    whisper: resolveWhisperChoice(),
    llm:
      state.llmProvider === "api"
        ? {
            provider: "api",
            service: state.llmService === "anthropic" ? "anthropic" : "",
            api_key: state.llmApiKey.trim(),
            model: state.llmModel.trim() || LLM_SERVICE_PRESETS[state.llmService].model,
            base_url:
              state.llmService === "custom"
                ? state.llmBaseUrl.trim()
                : LLM_SERVICE_PRESETS[state.llmService].baseUrl
          }
        : { provider: "local" }
  };
}

function resolveWhisperChoice(): ModelApiSettings {
  const state = useSettingsStore.getState();
  if (state.whisperProvider !== "api") {
    return { provider: "local" };
  }
  return {
    provider: "api",
    api_key: state.whisperApiKey.trim(),
    model: state.whisperModel.trim() || ASR_SERVICE_PRESETS[state.whisperService].model,
    base_url:
      state.whisperService === "custom"
        ? state.whisperBaseUrl.trim()
        : ASR_SERVICE_PRESETS[state.whisperService].baseUrl
  };
}

/** First message sent on the audio WebSocket: tells the backend which ASR to use
 * for this connection (local Whisper or an API provider with the user's key). */
export function getAsrWsHello(): string {
  const whisper = resolveWhisperChoice();
  return JSON.stringify({ type: "config", asr: whisper });
}

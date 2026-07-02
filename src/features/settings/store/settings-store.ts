import { create } from "zustand";
import { appConfig } from "@/shared/config/app-config";

const HTTP_KEY = "settings.backendHttpUrl";
const NAME_KEY = "settings.displayName";
const AUDIO_SOURCE_KEY = "settings.audioSource";
const WHISPER_PROVIDER_KEY = "settings.whisperProvider";
const WHISPER_API_KEY = "settings.whisperApiKey";
const LLM_PROVIDER_KEY = "settings.llmProvider";
const LLM_API_KEY = "settings.llmApiKey";

export const DEFAULT_DISPLAY_NAME = "Jerktionary";
export type AudioSource = "microphone" | "system";
export type ModelProvider = "local" | "api";

export type ModelApiSettings = {
  provider: ModelProvider;
  api_key?: string;
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

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}

function toModelSettings(provider: ModelProvider, apiKey: string): ModelApiSettings {
  const trimmed = apiKey.trim();
  return provider === "api" && trimmed ? { provider, api_key: trimmed } : { provider };
}

type SettingsState = {
  backendHttpUrl: string;
  displayName: string;
  audioSource: AudioSource;
  whisperProvider: ModelProvider;
  whisperApiKey: string;
  llmProvider: ModelProvider;
  llmApiKey: string;
  setBackendHttpUrl: (url: string) => void;
  setDisplayName: (name: string) => void;
  setAudioSource: (source: AudioSource) => void;
  setModelSettings: (settings: {
    whisperProvider: ModelProvider;
    whisperApiKey: string;
    llmProvider: ModelProvider;
    llmApiKey: string;
  }) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  backendHttpUrl: normalizeHttpUrl(readInitial(HTTP_KEY, appConfig.backendHttpUrl)),
  displayName: readInitial(NAME_KEY, DEFAULT_DISPLAY_NAME),
  audioSource: readAudioSource(),
  whisperProvider: readModelProvider(WHISPER_PROVIDER_KEY),
  whisperApiKey: readInitial(WHISPER_API_KEY, ""),
  llmProvider: readModelProvider(LLM_PROVIDER_KEY),
  llmApiKey: readInitial(LLM_API_KEY, ""),
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
  setAudioSource: (audioSource) => {
    writeSetting(AUDIO_SOURCE_KEY, audioSource);
    set({ audioSource });
  },
  setModelSettings: ({ whisperProvider, whisperApiKey, llmProvider, llmApiKey }) => {
    const trimmedWhisperKey = whisperApiKey.trim();
    const trimmedLlmKey = llmApiKey.trim();
    writeSetting(WHISPER_PROVIDER_KEY, whisperProvider);
    writeSetting(WHISPER_API_KEY, trimmedWhisperKey);
    writeSetting(LLM_PROVIDER_KEY, llmProvider);
    writeSetting(LLM_API_KEY, trimmedLlmKey);
    set({
      whisperProvider,
      whisperApiKey: trimmedWhisperKey,
      llmProvider,
      llmApiKey: trimmedLlmKey
    });
  }
}));

/** Non-reactive accessors for use outside React (fetch/WebSocket clients). */
export function getBackendHttpUrl(): string {
  return useSettingsStore.getState().backendHttpUrl;
}

export function getBackendWsUrl(): string {
  const url = new URL(`${getBackendHttpUrl().replace(/^http/i, "ws")}/ws/audio`);
  const { whisper } = getBackendModelSettings();
  url.searchParams.set("whisper_provider", whisper.provider);
  if (whisper.api_key) {
    url.searchParams.set("whisper_api_key", whisper.api_key);
  }
  return url.toString();
}

export function getBackendSwaggerUrl(): string {
  return `${getBackendHttpUrl()}/docs`;
}

export function getBackendModelSettings(): BackendModelSettings {
  const state = useSettingsStore.getState();
  return {
    whisper: toModelSettings(state.whisperProvider, state.whisperApiKey),
    llm: toModelSettings(state.llmProvider, state.llmApiKey)
  };
}

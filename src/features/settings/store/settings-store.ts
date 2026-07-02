import { create } from "zustand";
import { appConfig } from "@/shared/config/app-config";

const HTTP_KEY = "settings.backendHttpUrl";
const NAME_KEY = "settings.displayName";
const AUDIO_SOURCE_KEY = "settings.audioSource";

export const DEFAULT_DISPLAY_NAME = "Jerktionary";
export type AudioSource = "microphone" | "system";

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

type SettingsState = {
  backendHttpUrl: string;
  displayName: string;
  audioSource: AudioSource;
  setBackendHttpUrl: (url: string) => void;
  setDisplayName: (name: string) => void;
  setAudioSource: (source: AudioSource) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  backendHttpUrl: normalizeHttpUrl(readInitial(HTTP_KEY, appConfig.backendHttpUrl)),
  displayName: readInitial(NAME_KEY, DEFAULT_DISPLAY_NAME),
  audioSource: readAudioSource(),
  setBackendHttpUrl: (url) => {
    const normalized = normalizeHttpUrl(url) || appConfig.backendHttpUrl;
    try {
      localStorage.setItem(HTTP_KEY, normalized);
    } catch {
      // ignore storage errors (private mode etc.)
    }
    set({ backendHttpUrl: normalized });
  },
  setDisplayName: (name) => {
    const value = name.trim() || DEFAULT_DISPLAY_NAME;
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch {
      // ignore
    }
    set({ displayName: value });
  },
  setAudioSource: (audioSource) => {
    try {
      localStorage.setItem(AUDIO_SOURCE_KEY, audioSource);
    } catch {
      // ignore
    }
    set({ audioSource });
  }
}));

/** Non-reactive accessors for use outside React (fetch/WebSocket clients). */
export function getBackendHttpUrl(): string {
  return useSettingsStore.getState().backendHttpUrl;
}

export function getBackendWsUrl(): string {
  return `${getBackendHttpUrl().replace(/^http/i, "ws")}/ws/audio`;
}

export function getBackendSwaggerUrl(): string {
  return `${getBackendHttpUrl()}/docs`;
}

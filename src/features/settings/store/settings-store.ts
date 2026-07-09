import { create } from "zustand";
import { appConfig } from "@/shared/config/app-config";

// Provider/model/key selection used to live here and travel to the backend on
// every HTTP/WS request. It has moved server-side: the backend launcher now
// prompts for the LLM + Whisper provider and key at startup and mounts the
// chosen client. The frontend no longer knows or sends provider config.

const HTTP_KEY = "settings.backendHttpUrl";
const NAME_KEY = "settings.displayName";
const ABOUT_ME_KEY = "settings.aboutMe";
const AUDIO_SOURCE_KEY = "settings.audioSource";
const AUDIO_INPUT_DEVICE_KEY = "settings.audioInputDeviceId";
const THEME_KEY = "settings.theme";
const SETUP_COMPLETED_KEY = "settings.hasCompletedSetup";

export const DEFAULT_DISPLAY_NAME = "Jerktionary";
export type AudioSource = "microphone" | "system";
export type Theme = "light" | "dark";

function normalizeTheme(value: string): Theme {
  return value === "dark" ? "dark" : "light";
}

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

function normalizeAudioInputDeviceId(deviceId: string): string {
  return deviceId === "default" ? "" : deviceId;
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}

type SettingsState = {
  backendHttpUrl: string;
  displayName: string;
  /** Persistent "about me": role, stack, experience — personalizes live answers. */
  aboutMe: string;
  audioSource: AudioSource;
  /** Preferred microphone deviceId; empty string means the system default. */
  audioInputDeviceId: string;
  theme: Theme;
  hasCompletedSetup: boolean;
  setBackendHttpUrl: (url: string) => void;
  setDisplayName: (name: string) => void;
  setAboutMe: (aboutMe: string) => void;
  setAudioSource: (source: AudioSource) => void;
  setAudioInputDeviceId: (deviceId: string) => void;
  setTheme: (theme: Theme) => void;
  completeSetup: () => void;
  resetSetup: () => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  backendHttpUrl: normalizeHttpUrl(readInitial(HTTP_KEY, appConfig.backendHttpUrl)),
  displayName: readInitial(NAME_KEY, DEFAULT_DISPLAY_NAME),
  aboutMe: readInitial(ABOUT_ME_KEY, ""),
  audioSource: readAudioSource(),
  audioInputDeviceId: normalizeAudioInputDeviceId(readInitial(AUDIO_INPUT_DEVICE_KEY, "")),
  theme: normalizeTheme(readInitial(THEME_KEY, "light")),
  hasCompletedSetup: readInitial(SETUP_COMPLETED_KEY, "false") === "true",
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
    const normalized = normalizeAudioInputDeviceId(audioInputDeviceId);
    writeSetting(AUDIO_INPUT_DEVICE_KEY, normalized);
    set({ audioInputDeviceId: normalized });
  },
  setTheme: (theme) => {
    writeSetting(THEME_KEY, theme);
    set({ theme });
    document.documentElement.classList.toggle("dark", theme === "dark");
  },
  completeSetup: () => {
    writeSetting(SETUP_COMPLETED_KEY, "true");
    set({ hasCompletedSetup: true });
  },
  resetSetup: () => {
    writeSetting(SETUP_COMPLETED_KEY, "false");
    set({ hasCompletedSetup: false });
  }
}));

if (readInitial(THEME_KEY, "light") === "dark") {
  document.documentElement.classList.add("dark");
}

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

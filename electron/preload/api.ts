export type DesktopApi = {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  openExternal: (url: string) => Promise<void>;
  setContentProtection: (enabled: boolean) => Promise<void>;
  setWindowTitle: (title: string) => Promise<void>;
};

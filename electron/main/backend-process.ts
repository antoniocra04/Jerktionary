import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";

export type BackendProcessHandle = {
  process: ChildProcessWithoutNullStreams;
  stop: () => void;
};

export function startBackendProcess(command: string, args: string[] = []): BackendProcessHandle {
  const child = spawn(command, args, {
    stdio: "pipe",
    windowsHide: true
  });

  return {
    process: child,
    stop: () => {
      if (!child.killed) {
        child.kill();
      }
    }
  };
}

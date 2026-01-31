import type { OpenClawRuntime } from "openclaw/plugin-sdk";

let runtime: OpenClawRuntime | null = null;

export function setWecomRuntime(r: OpenClawRuntime) {
  runtime = r;
}

export function getWecomRuntime(): OpenClawRuntime {
  if (!runtime) {
    throw new Error("WeCom runtime not initialized");
  }
  return runtime;
}

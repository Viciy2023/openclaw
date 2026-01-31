import type { OpenClawRuntime } from "openclaw/plugin-sdk";

let runtime: OpenClawRuntime | null = null;

export function setFeishuRuntime(r: OpenClawRuntime) {
  runtime = r;
}

export function getFeishuRuntime(): OpenClawRuntime {
  if (!runtime) {
    throw new Error("Feishu runtime not initialized");
  }
  return runtime;
}

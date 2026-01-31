import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import type { ResolvedFeishuAccount, FeishuConfig } from "./types.js";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const LARK_API_BASE = "https://open.larksuite.com/open-apis";

// Token cache
let tokenCache: {
  appId: string;
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get tenant access token for Feishu API calls
 */
export async function getTenantAccessToken(params: {
  appId: string;
  appSecret: string;
  useLark?: boolean;
}): Promise<string> {
  const { appId, appSecret, useLark } = params;
  const now = Date.now();

  // Check cache
  if (tokenCache && tokenCache.appId === appId && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const baseUrl = useLark ? LARK_API_BASE : FEISHU_API_BASE;
  const response = await fetch(`${baseUrl}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get tenant access token: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
    expire?: number;
  };

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Feishu auth failed: ${data.msg || "Unknown error"}`);
  }

  // Cache the token
  tokenCache = {
    appId,
    token: data.tenant_access_token,
    expiresAt: now + (data.expire ?? 7200) * 1000,
  };

  return data.tenant_access_token;
}

/**
 * Send a message via Feishu API
 */
export async function sendFeishuMessage(params: {
  appId: string;
  appSecret: string;
  receiveId: string;
  receiveIdType: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  msgType: "text" | "post" | "image" | "interactive" | "share_chat" | "share_user" | "audio" | "media" | "file" | "sticker";
  content: string;
  uuid?: string;
  useLark?: boolean;
}): Promise<{ messageId: string; success: boolean }> {
  const { appId, appSecret, receiveId, receiveIdType, msgType, content, uuid, useLark } = params;

  const token = await getTenantAccessToken({ appId, appSecret, useLark });
  const baseUrl = useLark ? LARK_API_BASE : FEISHU_API_BASE;

  const response = await fetch(
    `${baseUrl}/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: msgType,
        content,
        uuid,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send Feishu message: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    data?: {
      message_id?: string;
    };
  };

  if (data.code !== 0) {
    throw new Error(`Feishu send failed: ${data.msg || "Unknown error"}`);
  }

  return {
    messageId: data.data?.message_id ?? "",
    success: true,
  };
}

/**
 * Reply to a message in Feishu
 */
export async function replyFeishuMessage(params: {
  appId: string;
  appSecret: string;
  messageId: string;
  msgType: "text" | "post" | "image" | "interactive";
  content: string;
  uuid?: string;
  useLark?: boolean;
}): Promise<{ messageId: string; success: boolean }> {
  const { appId, appSecret, messageId, msgType, content, uuid, useLark } = params;

  const token = await getTenantAccessToken({ appId, appSecret, useLark });
  const baseUrl = useLark ? LARK_API_BASE : FEISHU_API_BASE;

  const response = await fetch(`${baseUrl}/im/v1/messages/${messageId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      msg_type: msgType,
      content,
      uuid,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reply Feishu message: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    data?: {
      message_id?: string;
    };
  };

  if (data.code !== 0) {
    throw new Error(`Feishu reply failed: ${data.msg || "Unknown error"}`);
  }

  return {
    messageId: data.data?.message_id ?? "",
    success: true,
  };
}

/**
 * Probe Feishu API to check if credentials are valid
 */
export async function probeFeishu(params: {
  appId: string;
  appSecret: string;
  timeoutMs?: number;
  useLark?: boolean;
}): Promise<{ ok: boolean; error?: string; bot?: { name?: string } }> {
  const { appId, appSecret, useLark } = params;

  try {
    const token = await getTenantAccessToken({ appId, appSecret, useLark });
    const baseUrl = useLark ? LARK_API_BASE : FEISHU_API_BASE;

    // Get bot info
    const response = await fetch(`${baseUrl}/bot/v3/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      code: number;
      msg: string;
      bot?: {
        app_name?: string;
        avatar_url?: string;
        open_id?: string;
      };
    };

    if (data.code !== 0) {
      return { ok: false, error: data.msg };
    }

    return {
      ok: true,
      bot: {
        name: data.bot?.app_name,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * List all Feishu account IDs from config
 */
export function listFeishuAccountIds(cfg: OpenClawConfig): string[] {
  const feishu = cfg.channels?.feishu;
  if (!feishu) return [];

  const ids = new Set<string>();

  // Check if default account is configured
  if (feishu.appId || feishu.appSecret) {
    ids.add(DEFAULT_ACCOUNT_ID);
  }

  // Check named accounts
  if (feishu.accounts) {
    for (const accountId of Object.keys(feishu.accounts)) {
      ids.add(accountId);
    }
  }

  return Array.from(ids);
}

/**
 * Resolve default Feishu account ID
 */
export function resolveDefaultFeishuAccountId(cfg: OpenClawConfig): string {
  const feishu = cfg.channels?.feishu;
  if (!feishu) return DEFAULT_ACCOUNT_ID;

  // If default account has credentials, use it
  if (feishu.appId || feishu.appSecret) {
    return DEFAULT_ACCOUNT_ID;
  }

  // Otherwise, use first named account
  if (feishu.accounts) {
    const firstAccount = Object.keys(feishu.accounts)[0];
    if (firstAccount) return firstAccount;
  }

  return DEFAULT_ACCOUNT_ID;
}

/**
 * Resolve Feishu account configuration
 */
export function resolveFeishuAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string;
}): ResolvedFeishuAccount {
  const { cfg, accountId = DEFAULT_ACCOUNT_ID } = params;
  const feishu = cfg.channels?.feishu as FeishuConfig | undefined;

  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      accountId: DEFAULT_ACCOUNT_ID,
      name: feishu?.name ?? "Feishu",
      enabled: feishu?.enabled ?? false,
      appId: feishu?.appId ?? null,
      appSecret: feishu?.appSecret ?? null,
      encryptKey: feishu?.encryptKey ?? null,
      verificationToken: feishu?.verificationToken ?? null,
      config: {
        dmPolicy: feishu?.dmPolicy,
        allowFrom: feishu?.allowFrom,
        groupPolicy: feishu?.groupPolicy,
        requireMention: feishu?.requireMention,
        groupToolPolicy: feishu?.groupToolPolicy,
      },
    };
  }

  const account = feishu?.accounts?.[accountId];
  return {
    accountId,
    name: account?.name ?? accountId,
    enabled: account?.enabled ?? false,
    appId: account?.appId ?? null,
    appSecret: account?.appSecret ?? null,
    encryptKey: account?.encryptKey ?? null,
    verificationToken: account?.verificationToken ?? null,
    config: {
      dmPolicy: account?.dmPolicy ?? feishu?.dmPolicy,
      allowFrom: account?.allowFrom ?? feishu?.allowFrom,
      groupPolicy: account?.groupPolicy ?? feishu?.groupPolicy,
      requireMention: account?.requireMention ?? feishu?.requireMention,
      groupToolPolicy: account?.groupToolPolicy ?? feishu?.groupToolPolicy,
    },
  };
}

/**
 * Decrypt Feishu event callback (AES-256-CBC)
 */
export function decryptFeishuEvent(encrypt: string, encryptKey: string): string {
  // Note: This requires crypto module
  // Implementation depends on the runtime environment
  const crypto = require("crypto");

  const key = crypto.createHash("sha256").update(encryptKey).digest();
  const encryptedBuffer = Buffer.from(encrypt, "base64");

  // First 16 bytes are IV
  const iv = encryptedBuffer.slice(0, 16);
  const encrypted = encryptedBuffer.slice(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Verify Feishu event callback signature
 */
export function verifyFeishuSignature(params: {
  timestamp: string;
  nonce: string;
  encryptKey: string;
  body: string;
  signature: string;
}): boolean {
  const crypto = require("crypto");
  const { timestamp, nonce, encryptKey, body, signature } = params;

  const content = timestamp + nonce + encryptKey + body;
  const hash = crypto.createHash("sha256").update(content).digest("hex");

  return hash === signature;
}

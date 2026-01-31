import * as crypto from "node:crypto";

import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";

import type {
  ResolvedWecomAccount,
  WecomConfig,
  WecomMessage,
} from "./types.js";

const WECOM_API_BASE = "https://qyapi.weixin.qq.com/cgi-bin";

// Token cache
let tokenCache: {
  corpId: string;
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get access token for WeCom API calls
 */
export async function getAccessToken(params: {
  corpId: string;
  secret: string;
}): Promise<string> {
  const { corpId, secret } = params;
  const now = Date.now();

  // Check cache
  if (tokenCache && tokenCache.corpId === corpId && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const response = await fetch(
    `${WECOM_API_BASE}/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get WeCom access token: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    errcode: number;
    errmsg: string;
    access_token?: string;
    expires_in?: number;
  };

  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`WeCom auth failed: ${data.errmsg || "Unknown error"}`);
  }

  // Cache the token
  tokenCache = {
    corpId,
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 7200) * 1000,
  };

  return data.access_token;
}

/**
 * Send a message via WeCom API
 */
export async function sendWecomMessage(params: {
  corpId: string;
  secret: string;
  agentId: number;
  toUser?: string;
  toParty?: string;
  toTag?: string;
  msgType: "text" | "markdown" | "image" | "textcard" | "news";
  content: string;
  mediaId?: string;
}): Promise<{ msgId: string; success: boolean }> {
  const { corpId, secret, agentId, toUser, toParty, toTag, msgType, content, mediaId } = params;

  const token = await getAccessToken({ corpId, secret });

  let message: WecomMessage;

  switch (msgType) {
    case "text":
      message = {
        touser: toUser,
        toparty: toParty,
        totag: toTag,
        msgtype: "text",
        agentid: agentId,
        text: { content },
      };
      break;
    case "markdown":
      message = {
        touser: toUser,
        toparty: toParty,
        totag: toTag,
        msgtype: "markdown",
        agentid: agentId,
        markdown: { content },
      };
      break;
    case "image":
      message = {
        touser: toUser,
        toparty: toParty,
        totag: toTag,
        msgtype: "image",
        agentid: agentId,
        image: { media_id: mediaId ?? "" },
      };
      break;
    default:
      message = {
        touser: toUser,
        toparty: toParty,
        totag: toTag,
        msgtype: "text",
        agentid: agentId,
        text: { content },
      };
  }

  const response = await fetch(`${WECOM_API_BASE}/message/send?access_token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to send WeCom message: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    errcode: number;
    errmsg: string;
    msgid?: string;
  };

  if (data.errcode !== 0) {
    throw new Error(`WeCom send failed: ${data.errmsg || "Unknown error"}`);
  }

  return {
    msgId: data.msgid ?? "",
    success: true,
  };
}

/**
 * Upload media to WeCom
 */
export async function uploadWecomMedia(params: {
  corpId: string;
  secret: string;
  type: "image" | "voice" | "video" | "file";
  fileBuffer: Buffer;
  fileName: string;
}): Promise<{ mediaId: string }> {
  const { corpId, secret, type, fileBuffer, fileName } = params;

  const token = await getAccessToken({ corpId, secret });

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append("media", blob, fileName);

  const response = await fetch(
    `${WECOM_API_BASE}/media/upload?access_token=${token}&type=${type}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload WeCom media: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    errcode: number;
    errmsg: string;
    media_id?: string;
  };

  if (data.errcode !== 0 || !data.media_id) {
    throw new Error(`WeCom upload failed: ${data.errmsg || "Unknown error"}`);
  }

  return { mediaId: data.media_id };
}

/**
 * Probe WeCom API to check if credentials are valid
 */
export async function probeWecom(params: {
  corpId: string;
  secret: string;
  agentId: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; error?: string; agent?: { name?: string } }> {
  const { corpId, secret, agentId } = params;

  try {
    const token = await getAccessToken({ corpId, secret });

    // Get agent info
    const response = await fetch(
      `${WECOM_API_BASE}/agent/get?access_token=${token}&agentid=${agentId}`
    );

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      errcode: number;
      errmsg: string;
      name?: string;
      description?: string;
      square_logo_url?: string;
    };

    if (data.errcode !== 0) {
      return { ok: false, error: data.errmsg };
    }

    return {
      ok: true,
      agent: {
        name: data.name,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * List all WeCom account IDs from config
 */
export function listWecomAccountIds(cfg: OpenClawConfig): string[] {
  const wecom = cfg.channels?.wecom;
  if (!wecom) return [];

  const ids = new Set<string>();

  // Check if default account is configured
  if (wecom.corpId || wecom.secret) {
    ids.add(DEFAULT_ACCOUNT_ID);
  }

  // Check named accounts
  if (wecom.accounts) {
    for (const accountId of Object.keys(wecom.accounts)) {
      ids.add(accountId);
    }
  }

  return Array.from(ids);
}

/**
 * Resolve default WeCom account ID
 */
export function resolveDefaultWecomAccountId(cfg: OpenClawConfig): string {
  const wecom = cfg.channels?.wecom;
  if (!wecom) return DEFAULT_ACCOUNT_ID;

  // If default account has credentials, use it
  if (wecom.corpId || wecom.secret) {
    return DEFAULT_ACCOUNT_ID;
  }

  // Otherwise, use first named account
  if (wecom.accounts) {
    const firstAccount = Object.keys(wecom.accounts)[0];
    if (firstAccount) return firstAccount;
  }

  return DEFAULT_ACCOUNT_ID;
}

/**
 * Resolve WeCom account configuration
 */
export function resolveWecomAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string;
}): ResolvedWecomAccount {
  const { cfg, accountId = DEFAULT_ACCOUNT_ID } = params;
  const wecom = cfg.channels?.wecom as WecomConfig | undefined;

  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      accountId: DEFAULT_ACCOUNT_ID,
      name: wecom?.name ?? "WeCom",
      enabled: wecom?.enabled ?? false,
      corpId: wecom?.corpId ?? null,
      agentId: wecom?.agentId ?? null,
      secret: wecom?.secret ?? null,
      token: wecom?.token ?? null,
      encodingAESKey: wecom?.encodingAESKey ?? null,
      config: {
        dmPolicy: wecom?.dmPolicy,
        allowFrom: wecom?.allowFrom,
        groupPolicy: wecom?.groupPolicy,
        requireMention: wecom?.requireMention,
        groupToolPolicy: wecom?.groupToolPolicy,
      },
    };
  }

  const account = wecom?.accounts?.[accountId];
  return {
    accountId,
    name: account?.name ?? accountId,
    enabled: account?.enabled ?? false,
    corpId: account?.corpId ?? null,
    agentId: account?.agentId ?? null,
    secret: account?.secret ?? null,
    token: account?.token ?? null,
    encodingAESKey: account?.encodingAESKey ?? null,
    config: {
      dmPolicy: account?.dmPolicy ?? wecom?.dmPolicy,
      allowFrom: account?.allowFrom ?? wecom?.allowFrom,
      groupPolicy: account?.groupPolicy ?? wecom?.groupPolicy,
      requireMention: account?.requireMention ?? wecom?.requireMention,
      groupToolPolicy: account?.groupToolPolicy ?? wecom?.groupToolPolicy,
    },
  };
}

/**
 * Decrypt WeCom message (AES-256-CBC)
 */
export function decryptWecomMessage(
  encryptedMsg: string,
  encodingAESKey: string
): string {
  // Decode the AES key (base64 + "=" padding)
  const aesKey = Buffer.from(encodingAESKey + "=", "base64");
  const iv = aesKey.slice(0, 16);

  // Decrypt
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  let decrypted = decipher.update(encryptedMsg, "base64", "utf8");
  decrypted += decipher.final("utf8");

  // Remove PKCS7 padding
  const pad = decrypted.charCodeAt(decrypted.length - 1);
  decrypted = decrypted.slice(0, -pad);

  // Parse the decrypted content
  // Format: random(16) + msg_len(4) + msg + receiveid
  const msgLen = decrypted.slice(16, 20);
  const msgLenInt = Buffer.from(msgLen, "binary").readUInt32BE(0);
  const msg = decrypted.slice(20, 20 + msgLenInt);

  return msg;
}

/**
 * Verify WeCom callback signature
 */
export function verifyWecomSignature(params: {
  token: string;
  timestamp: string;
  nonce: string;
  echostr?: string;
  msgEncrypt?: string;
  signature: string;
}): boolean {
  const { token, timestamp, nonce, echostr, msgEncrypt, signature } = params;

  const arr = [token, timestamp, nonce];
  if (echostr) arr.push(echostr);
  if (msgEncrypt) arr.push(msgEncrypt);

  arr.sort();
  const str = arr.join("");
  const hash = crypto.createHash("sha1").update(str).digest("hex");

  return hash === signature;
}

/**
 * Generate reply signature for WeCom
 */
export function generateWecomReplySignature(params: {
  token: string;
  timestamp: string;
  nonce: string;
  encrypt: string;
}): string {
  const { token, timestamp, nonce, encrypt } = params;

  const arr = [token, timestamp, nonce, encrypt].sort();
  const str = arr.join("");
  return crypto.createHash("sha1").update(str).digest("hex");
}

/**
 * Encrypt WeCom reply message
 */
export function encryptWecomMessage(params: {
  message: string;
  encodingAESKey: string;
  corpId: string;
}): string {
  const { message, encodingAESKey, corpId } = params;

  // Decode the AES key
  const aesKey = Buffer.from(encodingAESKey + "=", "base64");
  const iv = aesKey.slice(0, 16);

  // Generate random bytes
  const random = crypto.randomBytes(16);

  // Build the content: random(16) + msg_len(4) + msg + receiveid
  const msgLen = Buffer.alloc(4);
  msgLen.writeUInt32BE(Buffer.byteLength(message), 0);

  const content = Buffer.concat([
    random,
    msgLen,
    Buffer.from(message),
    Buffer.from(corpId),
  ]);

  // Add PKCS7 padding
  const blockSize = 32;
  const padLen = blockSize - (content.length % blockSize);
  const padding = Buffer.alloc(padLen, padLen);
  const padded = Buffer.concat([content, padding]);

  // Encrypt
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  cipher.setAutoPadding(false);

  let encrypted = cipher.update(padded, undefined, "base64");
  encrypted += cipher.final("base64");

  return encrypted;
}

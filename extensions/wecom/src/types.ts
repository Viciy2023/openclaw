import type { OpenClawConfig } from "openclaw/plugin-sdk";

/**
 * WeCom (企业微信) configuration schema
 */
export const WecomConfigSchema = {
  type: "object",
  properties: {
    enabled: { type: "boolean", default: false },
    corpId: { type: "string", description: "企业ID (Corp ID)" },
    agentId: { type: "string", description: "应用ID (Agent ID)" },
    secret: { type: "string", description: "应用Secret" },
    token: { type: "string", description: "回调Token (用于验证消息)" },
    encodingAESKey: { type: "string", description: "消息加密密钥 (EncodingAESKey)" },
    name: { type: "string", description: "账户显示名称" },
    dmPolicy: {
      type: "string",
      enum: ["open", "pairing", "allowlist"],
      default: "pairing",
    },
    allowFrom: {
      type: "array",
      items: { type: "string" },
      description: "允许的用户ID列表",
    },
    groupPolicy: {
      type: "string",
      enum: ["open", "allowlist"],
      default: "allowlist",
    },
    requireMention: { type: "boolean", default: true },
    groupToolPolicy: {
      type: "string",
      enum: ["elevated", "normal", "disabled"],
      default: "elevated",
    },
    replyToMode: {
      type: "string",
      enum: ["first", "last", "none"],
      default: "first",
    },
    accounts: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          corpId: { type: "string" },
          agentId: { type: "string" },
          secret: { type: "string" },
          token: { type: "string" },
          encodingAESKey: { type: "string" },
          name: { type: "string" },
          dmPolicy: { type: "string" },
          allowFrom: { type: "array", items: { type: "string" } },
          groupPolicy: { type: "string" },
          requireMention: { type: "boolean" },
          groupToolPolicy: { type: "string" },
        },
      },
    },
  },
} as const;

export type WecomConfig = {
  enabled?: boolean;
  corpId?: string;
  agentId?: string;
  secret?: string;
  token?: string;
  encodingAESKey?: string;
  name?: string;
  dmPolicy?: "open" | "pairing" | "allowlist";
  allowFrom?: string[];
  groupPolicy?: "open" | "allowlist";
  requireMention?: boolean;
  groupToolPolicy?: "elevated" | "normal" | "disabled";
  replyToMode?: "first" | "last" | "none";
  accounts?: Record<string, Partial<WecomAccountConfig>>;
};

export type WecomAccountConfig = {
  enabled?: boolean;
  corpId?: string;
  agentId?: string;
  secret?: string;
  token?: string;
  encodingAESKey?: string;
  name?: string;
  dmPolicy?: "open" | "pairing" | "allowlist";
  allowFrom?: string[];
  groupPolicy?: "open" | "allowlist";
  requireMention?: boolean;
  groupToolPolicy?: "elevated" | "normal" | "disabled";
};

export type ResolvedWecomAccount = {
  accountId: string;
  name: string;
  enabled: boolean;
  corpId: string | null;
  agentId: string | null;
  secret: string | null;
  token: string | null;
  encodingAESKey: string | null;
  config: {
    dmPolicy?: "open" | "pairing" | "allowlist";
    allowFrom?: string[];
    groupPolicy?: "open" | "allowlist";
    requireMention?: boolean;
    groupToolPolicy?: "elevated" | "normal" | "disabled";
  };
};

/**
 * WeCom message types
 */
export type WecomMessageType = "text" | "image" | "voice" | "video" | "file" | "textcard" | "news" | "mpnews" | "markdown" | "miniprogram_notice" | "template_card";

export type WecomTextMessage = {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: "text";
  agentid: number;
  text: {
    content: string;
  };
  safe?: 0 | 1;
  enable_id_trans?: 0 | 1;
  enable_duplicate_check?: 0 | 1;
  duplicate_check_interval?: number;
};

export type WecomMarkdownMessage = {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: "markdown";
  agentid: number;
  markdown: {
    content: string;
  };
  enable_duplicate_check?: 0 | 1;
  duplicate_check_interval?: number;
};

export type WecomImageMessage = {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: "image";
  agentid: number;
  image: {
    media_id: string;
  };
  safe?: 0 | 1;
  enable_duplicate_check?: 0 | 1;
  duplicate_check_interval?: number;
};

export type WecomMessage = WecomTextMessage | WecomMarkdownMessage | WecomImageMessage;

/**
 * WeCom callback event types
 */
export type WecomEvent = {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content?: string;
  MsgId?: string;
  AgentID?: number;
  Event?: string;
  EventKey?: string;
  ChatId?: string;
};

declare module "openclaw/plugin-sdk" {
  interface OpenClawConfig {
    channels?: {
      wecom?: WecomConfig;
    } & OpenClawConfig["channels"];
  }
}

import type { OpenClawConfig } from "openclaw/plugin-sdk";

/**
 * Feishu/Lark configuration schema
 */
export const FeishuConfigSchema = {
  type: "object",
  properties: {
    enabled: { type: "boolean", default: false },
    appId: { type: "string", description: "Feishu App ID" },
    appSecret: { type: "string", description: "Feishu App Secret" },
    encryptKey: { type: "string", description: "Event encryption key (optional)" },
    verificationToken: { type: "string", description: "Event verification token" },
    name: { type: "string", description: "Account display name" },
    dmPolicy: {
      type: "string",
      enum: ["open", "pairing", "allowlist"],
      default: "pairing",
    },
    allowFrom: {
      type: "array",
      items: { type: "string" },
      description: "Allowed user IDs for DM",
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
          appId: { type: "string" },
          appSecret: { type: "string" },
          encryptKey: { type: "string" },
          verificationToken: { type: "string" },
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

export type FeishuConfig = {
  enabled?: boolean;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  name?: string;
  dmPolicy?: "open" | "pairing" | "allowlist";
  allowFrom?: string[];
  groupPolicy?: "open" | "allowlist";
  requireMention?: boolean;
  groupToolPolicy?: "elevated" | "normal" | "disabled";
  replyToMode?: "first" | "last" | "none";
  accounts?: Record<string, Partial<FeishuAccountConfig>>;
};

export type FeishuAccountConfig = {
  enabled?: boolean;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  name?: string;
  dmPolicy?: "open" | "pairing" | "allowlist";
  allowFrom?: string[];
  groupPolicy?: "open" | "allowlist";
  requireMention?: boolean;
  groupToolPolicy?: "elevated" | "normal" | "disabled";
};

export type ResolvedFeishuAccount = {
  accountId: string;
  name: string;
  enabled: boolean;
  appId: string | null;
  appSecret: string | null;
  encryptKey: string | null;
  verificationToken: string | null;
  config: {
    dmPolicy?: "open" | "pairing" | "allowlist";
    allowFrom?: string[];
    groupPolicy?: "open" | "allowlist";
    requireMention?: boolean;
    groupToolPolicy?: "elevated" | "normal" | "disabled";
  };
};

export type FeishuMessage = {
  message_id: string;
  root_id?: string;
  parent_id?: string;
  create_time: string;
  chat_id: string;
  chat_type: "p2p" | "group";
  message_type: string;
  content: string;
  mentions?: Array<{
    key: string;
    id: {
      union_id?: string;
      user_id?: string;
      open_id?: string;
    };
    name: string;
  }>;
  sender: {
    sender_id: {
      union_id?: string;
      user_id?: string;
      open_id?: string;
    };
    sender_type: string;
    tenant_key?: string;
  };
};

export type FeishuEvent = {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender?: FeishuMessage["sender"];
    message?: FeishuMessage;
  };
};

declare module "openclaw/plugin-sdk" {
  interface OpenClawConfig {
    channels?: {
      feishu?: FeishuConfig;
    } & OpenClawConfig["channels"];
  }
}

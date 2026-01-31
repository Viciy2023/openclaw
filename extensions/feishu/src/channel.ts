import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  formatPairingApproveHint,
  getChatChannelMeta,
  normalizeAccountId,
  PAIRING_APPROVED_MESSAGE,
  type ChannelPlugin,
  type OpenClawConfig,
} from "openclaw/plugin-sdk";

import { getFeishuRuntime } from "./runtime.js";
import { FeishuConfigSchema, type ResolvedFeishuAccount } from "./types.js";
import {
  listFeishuAccountIds,
  resolveFeishuAccount,
  resolveDefaultFeishuAccountId,
  sendFeishuMessage,
  probeFeishu,
} from "./api.js";

const meta = getChatChannelMeta("feishu");

export const feishuPlugin: ChannelPlugin<ResolvedFeishuAccount> = {
  id: "feishu",
  meta: {
    ...meta,
    label: "Feishu/Lark",
    quickstartAllowFrom: true,
  },
  pairing: {
    idLabel: "feishuUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^(feishu|lark):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveFeishuAccount({ cfg, accountId: DEFAULT_ACCOUNT_ID });
      if (!account.appId || !account.appSecret) {
        throw new Error("Feishu app credentials not configured");
      }
      await sendFeishuMessage({
        appId: account.appId,
        appSecret: account.appSecret,
        receiveId: id,
        receiveIdType: "open_id",
        msgType: "text",
        content: JSON.stringify({ text: PAIRING_APPROVED_MESSAGE }),
      });
    },
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: true,
    threads: true,
    media: true,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.feishu"] },
  configSchema: buildChannelConfigSchema(FeishuConfigSchema),
  config: {
    listAccountIds: (cfg) => listFeishuAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveFeishuAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultFeishuAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) => {
      const next = { ...cfg };
      if (accountId === DEFAULT_ACCOUNT_ID) {
        next.channels = {
          ...next.channels,
          feishu: {
            ...next.channels?.feishu,
            enabled,
          },
        };
      } else {
        next.channels = {
          ...next.channels,
          feishu: {
            ...next.channels?.feishu,
            accounts: {
              ...next.channels?.feishu?.accounts,
              [accountId]: {
                ...next.channels?.feishu?.accounts?.[accountId],
                enabled,
              },
            },
          },
        };
      }
      return next;
    },
    deleteAccount: ({ cfg, accountId }) => {
      const next = { ...cfg };
      if (accountId === DEFAULT_ACCOUNT_ID) {
        const feishu = { ...next.channels?.feishu };
        delete feishu.appId;
        delete feishu.appSecret;
        next.channels = { ...next.channels, feishu };
      } else {
        const accounts = { ...next.channels?.feishu?.accounts };
        delete accounts[accountId];
        next.channels = {
          ...next.channels,
          feishu: {
            ...next.channels?.feishu,
            accounts,
          },
        };
      }
      return next;
    },
    isConfigured: (account) => Boolean(account.appId?.trim() && account.appSecret?.trim()),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.appId?.trim() && account.appSecret?.trim()),
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveFeishuAccount({ cfg, accountId }).config.allowFrom ?? []).map((entry) =>
        String(entry),
      ),
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^(feishu|lark):/i, ""))
        .map((entry) => entry.toLowerCase()),
  },
  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
      const useAccountPath = Boolean(cfg.channels?.feishu?.accounts?.[resolvedAccountId]);
      const basePath = useAccountPath
        ? `channels.feishu.accounts.${resolvedAccountId}.`
        : "channels.feishu.";
      return {
        policy: account.config.dmPolicy ?? "pairing",
        allowFrom: account.config.allowFrom ?? [],
        policyPath: `${basePath}dmPolicy`,
        allowFromPath: basePath,
        approveHint: formatPairingApproveHint("feishu"),
        normalizeEntry: (raw) => raw.replace(/^(feishu|lark):/i, ""),
      };
    },
    collectWarnings: ({ account, cfg }) => {
      const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
      const groupPolicy = account.config.groupPolicy ?? defaultGroupPolicy ?? "allowlist";
      if (groupPolicy !== "open") return [];
      return [
        `- Feishu groups: groupPolicy="open" allows any member in allowed groups to trigger. Set channels.feishu.groupPolicy="allowlist" to restrict.`,
      ];
    },
  },
  groups: {
    resolveRequireMention: ({ cfg, accountId }) => {
      const account = resolveFeishuAccount({ cfg, accountId });
      return account.config.requireMention ?? true;
    },
    resolveToolPolicy: ({ cfg, accountId }) => {
      const account = resolveFeishuAccount({ cfg, accountId });
      return account.config.groupToolPolicy ?? "elevated";
    },
  },
  threading: {
    resolveReplyToMode: ({ cfg }) => cfg.channels?.feishu?.replyToMode ?? "first",
  },
  messaging: {
    normalizeTarget: (target) => {
      if (!target) return null;
      const trimmed = target.trim();
      if (!trimmed) return null;
      // Feishu uses open_id, user_id, union_id, or chat_id
      return trimmed;
    },
    targetResolver: {
      looksLikeId: (id) => /^(ou_|on_|oc_|cli_)[a-zA-Z0-9]+$/.test(id),
      hint: "<open_id|chat_id>",
    },
  },
  directory: {
    self: async () => null,
    listPeers: async () => [],
    listGroups: async () => [],
  },
  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => {
      // Simple text chunking for Feishu
      const chunks: string[] = [];
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= limit) {
          chunks.push(remaining);
          break;
        }
        // Find a good break point
        let breakPoint = remaining.lastIndexOf("\n", limit);
        if (breakPoint === -1 || breakPoint < limit * 0.5) {
          breakPoint = remaining.lastIndexOf(" ", limit);
        }
        if (breakPoint === -1 || breakPoint < limit * 0.5) {
          breakPoint = limit;
        }
        chunks.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint).trimStart();
      }
      return chunks;
    },
    chunkerMode: "text",
    textChunkLimit: 4000,
    sendText: async ({ to, text, accountId }) => {
      const runtime = getFeishuRuntime();
      const cfg = runtime.config.loadConfig();
      const account = resolveFeishuAccount({ cfg, accountId });

      if (!account.appId || !account.appSecret) {
        throw new Error("Feishu app credentials not configured");
      }

      const result = await sendFeishuMessage({
        appId: account.appId,
        appSecret: account.appSecret,
        receiveId: to,
        receiveIdType: to.startsWith("oc_") ? "chat_id" : "open_id",
        msgType: "text",
        content: JSON.stringify({ text }),
      });

      return { channel: "feishu", ...result };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId }) => {
      const runtime = getFeishuRuntime();
      const cfg = runtime.config.loadConfig();
      const account = resolveFeishuAccount({ cfg, accountId });

      if (!account.appId || !account.appSecret) {
        throw new Error("Feishu app credentials not configured");
      }

      // For media, we send as rich text with image
      const content = mediaUrl
        ? JSON.stringify({
            zh_cn: {
              title: "",
              content: [
                [{ tag: "text", text: text || "" }],
                [{ tag: "img", image_key: mediaUrl }],
              ],
            },
          })
        : JSON.stringify({ text: text || "" });

      const result = await sendFeishuMessage({
        appId: account.appId,
        appSecret: account.appSecret,
        receiveId: to,
        receiveIdType: to.startsWith("oc_") ? "chat_id" : "open_id",
        msgType: mediaUrl ? "post" : "text",
        content,
      });

      return { channel: "feishu", ...result };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    collectStatusIssues: ({ account }) => {
      const issues: string[] = [];
      if (!account.appId?.trim()) {
        issues.push("App ID not configured");
      }
      if (!account.appSecret?.trim()) {
        issues.push("App Secret not configured");
      }
      return issues;
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ account, timeoutMs }) => {
      if (!account.appId || !account.appSecret) {
        return { ok: false, error: "App credentials not configured" };
      }
      return probeFeishu({
        appId: account.appId,
        appSecret: account.appSecret,
        timeoutMs,
      });
    },
    buildAccountSnapshot: ({ account, runtime, probe }) => {
      const configured = Boolean(account.appId?.trim() && account.appSecret?.trim());
      return {
        accountId: account.accountId,
        name: account.name,
        enabled: account.enabled,
        configured,
        running: runtime?.running ?? false,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        lastError: runtime?.lastError ?? null,
        probe,
        lastInboundAt: runtime?.lastInboundAt ?? null,
        lastOutboundAt: runtime?.lastOutboundAt ?? null,
      };
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      ctx.log?.info(`[${account.accountId}] starting Feishu provider`);

      // Feishu uses webhook-based event subscription
      // The actual webhook handling is done by the gateway
      return {
        stop: () => {
          ctx.log?.info(`[${account.accountId}] stopping Feishu provider`);
        },
      };
    },
    logoutAccount: async ({ accountId, cfg }) => {
      const nextCfg = { ...cfg } as OpenClawConfig;
      let cleared = false;
      let changed = false;

      const nextFeishu = cfg.channels?.feishu ? { ...cfg.channels.feishu } : undefined;

      if (nextFeishu) {
        if (accountId === DEFAULT_ACCOUNT_ID) {
          if (nextFeishu.appId || nextFeishu.appSecret) {
            delete nextFeishu.appId;
            delete nextFeishu.appSecret;
            cleared = true;
            changed = true;
          }
        } else {
          const accounts = nextFeishu.accounts ? { ...nextFeishu.accounts } : undefined;
          if (accounts && accountId in accounts) {
            delete accounts[accountId];
            changed = true;
            cleared = true;
          }
          if (accounts) {
            nextFeishu.accounts = accounts;
          }
        }
      }

      if (changed && nextFeishu) {
        nextCfg.channels = { ...nextCfg.channels, feishu: nextFeishu };
        await getFeishuRuntime().config.writeConfigFile(nextCfg);
      }

      return { cleared, loggedOut: cleared };
    },
  },
};

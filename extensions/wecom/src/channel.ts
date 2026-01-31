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

import { getWecomRuntime } from "./runtime.js";
import { WecomConfigSchema, type ResolvedWecomAccount } from "./types.js";
import {
  listWecomAccountIds,
  resolveWecomAccount,
  resolveDefaultWecomAccountId,
  sendWecomMessage,
  probeWecom,
} from "./api.js";

const meta = getChatChannelMeta("wecom");

export const wecomPlugin: ChannelPlugin<ResolvedWecomAccount> = {
  id: "wecom",
  meta: {
    ...meta,
    label: "WeCom (企业微信)",
    quickstartAllowFrom: true,
  },
  pairing: {
    idLabel: "wecomUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^wecom:/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveWecomAccount({ cfg, accountId: DEFAULT_ACCOUNT_ID });
      if (!account.corpId || !account.secret || !account.agentId) {
        throw new Error("WeCom credentials not configured");
      }
      await sendWecomMessage({
        corpId: account.corpId,
        secret: account.secret,
        agentId: parseInt(account.agentId, 10),
        toUser: id,
        msgType: "text",
        content: PAIRING_APPROVED_MESSAGE,
      });
    },
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.wecom"] },
  configSchema: buildChannelConfigSchema(WecomConfigSchema),
  config: {
    listAccountIds: (cfg) => listWecomAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveWecomAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultWecomAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) => {
      const next = { ...cfg };
      if (accountId === DEFAULT_ACCOUNT_ID) {
        next.channels = {
          ...next.channels,
          wecom: {
            ...next.channels?.wecom,
            enabled,
          },
        };
      } else {
        next.channels = {
          ...next.channels,
          wecom: {
            ...next.channels?.wecom,
            accounts: {
              ...next.channels?.wecom?.accounts,
              [accountId]: {
                ...next.channels?.wecom?.accounts?.[accountId],
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
        const wecom = { ...next.channels?.wecom };
        delete wecom.corpId;
        delete wecom.agentId;
        delete wecom.secret;
        next.channels = { ...next.channels, wecom };
      } else {
        const accounts = { ...next.channels?.wecom?.accounts };
        delete accounts[accountId];
        next.channels = {
          ...next.channels,
          wecom: {
            ...next.channels?.wecom,
            accounts,
          },
        };
      }
      return next;
    },
    isConfigured: (account) =>
      Boolean(account.corpId?.trim() && account.agentId?.trim() && account.secret?.trim()),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(
        account.corpId?.trim() && account.agentId?.trim() && account.secret?.trim()
      ),
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveWecomAccount({ cfg, accountId }).config.allowFrom ?? []).map((entry) =>
        String(entry)
      ),
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^wecom:/i, ""))
        .map((entry) => entry.toLowerCase()),
  },
  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
      const useAccountPath = Boolean(cfg.channels?.wecom?.accounts?.[resolvedAccountId]);
      const basePath = useAccountPath
        ? `channels.wecom.accounts.${resolvedAccountId}.`
        : "channels.wecom.";
      return {
        policy: account.config.dmPolicy ?? "pairing",
        allowFrom: account.config.allowFrom ?? [],
        policyPath: `${basePath}dmPolicy`,
        allowFromPath: basePath,
        approveHint: formatPairingApproveHint("wecom"),
        normalizeEntry: (raw) => raw.replace(/^wecom:/i, ""),
      };
    },
    collectWarnings: ({ account, cfg }) => {
      const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
      const groupPolicy = account.config.groupPolicy ?? defaultGroupPolicy ?? "allowlist";
      if (groupPolicy !== "open") return [];
      return [
        `- WeCom groups: groupPolicy="open" allows any member in allowed groups to trigger. Set channels.wecom.groupPolicy="allowlist" to restrict.`,
      ];
    },
  },
  groups: {
    resolveRequireMention: ({ cfg, accountId }) => {
      const account = resolveWecomAccount({ cfg, accountId });
      return account.config.requireMention ?? true;
    },
    resolveToolPolicy: ({ cfg, accountId }) => {
      const account = resolveWecomAccount({ cfg, accountId });
      return account.config.groupToolPolicy ?? "elevated";
    },
  },
  threading: {
    resolveReplyToMode: ({ cfg }) => cfg.channels?.wecom?.replyToMode ?? "first",
  },
  messaging: {
    normalizeTarget: (target) => {
      if (!target) return null;
      const trimmed = target.trim();
      if (!trimmed) return null;
      return trimmed;
    },
    targetResolver: {
      looksLikeId: (id) => /^[a-zA-Z0-9_-]+$/.test(id),
      hint: "<userId|partyId>",
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
      // Simple text chunking for WeCom
      const chunks: string[] = [];
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= limit) {
          chunks.push(remaining);
          break;
        }
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
    textChunkLimit: 2048, // WeCom text message limit
    sendText: async ({ to, text, accountId }) => {
      const runtime = getWecomRuntime();
      const cfg = runtime.config.loadConfig();
      const account = resolveWecomAccount({ cfg, accountId });

      if (!account.corpId || !account.secret || !account.agentId) {
        throw new Error("WeCom credentials not configured");
      }

      const result = await sendWecomMessage({
        corpId: account.corpId,
        secret: account.secret,
        agentId: parseInt(account.agentId, 10),
        toUser: to,
        msgType: "text",
        content: text,
      });

      return { channel: "wecom", ...result };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId }) => {
      const runtime = getWecomRuntime();
      const cfg = runtime.config.loadConfig();
      const account = resolveWecomAccount({ cfg, accountId });

      if (!account.corpId || !account.secret || !account.agentId) {
        throw new Error("WeCom credentials not configured");
      }

      // For media, we need to upload first and get media_id
      // For now, send as text with URL
      const content = mediaUrl ? `${text || ""}\n${mediaUrl}` : text || "";

      const result = await sendWecomMessage({
        corpId: account.corpId,
        secret: account.secret,
        agentId: parseInt(account.agentId, 10),
        toUser: to,
        msgType: "text",
        content,
      });

      return { channel: "wecom", ...result };
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
      if (!account.corpId?.trim()) {
        issues.push("Corp ID not configured");
      }
      if (!account.agentId?.trim()) {
        issues.push("Agent ID not configured");
      }
      if (!account.secret?.trim()) {
        issues.push("Secret not configured");
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
      if (!account.corpId || !account.secret || !account.agentId) {
        return { ok: false, error: "Credentials not configured" };
      }
      return probeWecom({
        corpId: account.corpId,
        secret: account.secret,
        agentId: account.agentId,
        timeoutMs,
      });
    },
    buildAccountSnapshot: ({ account, runtime, probe }) => {
      const configured = Boolean(
        account.corpId?.trim() && account.agentId?.trim() && account.secret?.trim()
      );
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
      ctx.log?.info(`[${account.accountId}] starting WeCom provider`);

      // WeCom uses webhook-based event subscription
      // The actual webhook handling is done by the gateway
      return {
        stop: () => {
          ctx.log?.info(`[${account.accountId}] stopping WeCom provider`);
        },
      };
    },
    logoutAccount: async ({ accountId, cfg }) => {
      const nextCfg = { ...cfg } as OpenClawConfig;
      let cleared = false;
      let changed = false;

      const nextWecom = cfg.channels?.wecom ? { ...cfg.channels.wecom } : undefined;

      if (nextWecom) {
        if (accountId === DEFAULT_ACCOUNT_ID) {
          if (nextWecom.corpId || nextWecom.agentId || nextWecom.secret) {
            delete nextWecom.corpId;
            delete nextWecom.agentId;
            delete nextWecom.secret;
            cleared = true;
            changed = true;
          }
        } else {
          const accounts = nextWecom.accounts ? { ...nextWecom.accounts } : undefined;
          if (accounts && accountId in accounts) {
            delete accounts[accountId];
            changed = true;
            cleared = true;
          }
          if (accounts) {
            nextWecom.accounts = accounts;
          }
        }
      }

      if (changed && nextWecom) {
        nextCfg.channels = { ...nextCfg.channels, wecom: nextWecom };
        await getWecomRuntime().config.writeConfigFile(nextCfg);
      }

      return { cleared, loggedOut: cleared };
    },
  },
};

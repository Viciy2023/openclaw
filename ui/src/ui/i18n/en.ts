/**
 * English language strings for Web UI
 */
export const en = {
  // Navigation
  nav: {
    chat: "Chat",
    overview: "Overview",
    channels: "Channels",
    instances: "Instances",
    sessions: "Sessions",
    cronJobs: "Cron Jobs",
    skills: "Skills",
    nodes: "Nodes",
    config: "Config",
    debug: "Debug",
    logs: "Logs",
    control: "Control",
    agent: "Agent",
    settings: "Settings",
  },

  // Common
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    remove: "Remove",
    reload: "Reload",
    apply: "Apply",
    update: "Update",
    close: "Close",
    confirm: "Confirm",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Info",
    yes: "Yes",
    no: "No",
    on: "On",
    off: "Off",
    enabled: "Enabled",
    disabled: "Disabled",
    status: "Status",
    name: "Name",
    description: "Description",
    actions: "Actions",
    noData: "No data",
    noChanges: "No changes",
    valid: "valid",
    invalid: "invalid",
    form: "Form",
    raw: "Raw",
    allSettings: "All Settings",
    language: "Language",
  },

  // Health status
  health: {
    ok: "Health OK",
    error: "Health Error",
    checking: "Checking...",
  },

  // Config page
  config: {
    title: "Config",
    subtitle: "Edit ~/.openclaw/openclaw.json safely.",
    settings: "Settings",
    searchSettings: "Search settings...",
    environment: "Environment",
    updates: "Updates",
    agents: "Agents",
    authentication: "Authentication",
    channels: "Channels",
    messages: "Messages",
    models: "Models",
    plugins: "Plugins",
    session: "Session",
    tools: "Tools",
    ackMaxChars: "Ack Max Chars",
    activeHours: "Active Hours",
    start: "Start",
    end: "End",
    timezone: "Timezone",
  },

  // Channels
  channels: {
    title: "Channels",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    slack: "Slack",
    discord: "Discord",
    googleChat: "Google Chat",
    signal: "Signal",
    iMessage: "iMessage",
    blueBubbles: "BlueBubbles",
    msTeams: "Microsoft Teams",
    matrix: "Matrix",
    zalo: "Zalo",
    zaloPersonal: "Zalo Personal",
    webChat: "WebChat",
    feishu: "Feishu",
    wecom: "WeCom",
    nostr: "Nostr",
    configured: "Configured",
    notConfigured: "Not Configured",
    running: "Running",
    stopped: "Stopped",
    connect: "Connect",
    disconnect: "Disconnect",
    login: "Login",
    logout: "Logout",
    scanQR: "Scan QR Code",
    waitingForScan: "Waiting for scan...",
  },

  // Chat
  chat: {
    title: "Chat",
    sendMessage: "Send message",
    typeMessage: "Type a message...",
    thinking: "Thinking...",
    streaming: "Streaming...",
    abort: "Abort",
    newSession: "New Session",
    clearHistory: "Clear History",
    attachFile: "Attach file",
    copyMessage: "Copy message",
    regenerate: "Regenerate",
  },

  // Sessions
  sessions: {
    title: "Sessions",
    active: "Active",
    inactive: "Inactive",
    global: "Global",
    unknown: "Unknown",
    filterActive: "Filter active",
    limit: "Limit",
    includeGlobal: "Include global",
    includeUnknown: "Include unknown",
  },

  // Agents
  agents: {
    title: "Agents",
    default: "Default",
    custom: "Custom",
  },

  // Cron Jobs
  cron: {
    title: "Cron Jobs",
    schedule: "Schedule",
    lastRun: "Last Run",
    nextRun: "Next Run",
    runs: "Runs",
    create: "Create Job",
    expression: "Cron Expression",
    command: "Command",
  },

  // Skills
  skills: {
    title: "Skills",
    available: "Available",
    installed: "Installed",
    install: "Install",
    uninstall: "Uninstall",
  },

  // Nodes
  nodes: {
    title: "Nodes",
    connected: "Connected",
    disconnected: "Disconnected",
  },

  // Debug
  debug: {
    title: "Debug",
    status: "Status",
    health: "Health",
    models: "Models",
    heartbeat: "Heartbeat",
    callMethod: "Call Method",
    params: "Parameters",
    result: "Result",
  },

  // Logs
  logs: {
    title: "Logs",
    level: "Level",
    message: "Message",
    timestamp: "Timestamp",
    export: "Export",
    autoFollow: "Auto Follow",
    filterText: "Filter text...",
    levels: {
      debug: "Debug",
      info: "Info",
      warn: "Warning",
      error: "Error",
    },
  },

  // Overview
  overview: {
    title: "Overview",
    gateway: "Gateway",
    version: "Version",
    uptime: "Uptime",
    memory: "Memory",
    cpu: "CPU",
  },

  // Instances
  instances: {
    title: "Instances",
  },

  // Errors
  errors: {
    connectionFailed: "Connection failed",
    loadFailed: "Failed to load",
    saveFailed: "Failed to save",
    invalidConfig: "Invalid configuration",
    unauthorized: "Unauthorized",
    notFound: "Not found",
    serverError: "Server error",
    networkError: "Network error",
    timeout: "Request timeout",
  },

  // Confirmations
  confirm: {
    delete: "Are you sure you want to delete this?",
    reset: "Are you sure you want to reset?",
    logout: "Are you sure you want to logout?",
    discard: "Discard unsaved changes?",
  },

  // Time
  time: {
    now: "Now",
    seconds: "seconds",
    minutes: "minutes",
    hours: "hours",
    days: "days",
    ago: "ago",
  },
};

export type UiTranslations = typeof en;

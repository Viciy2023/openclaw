/**
 * English language strings
 */
export const en = {
  // Commands
  commands: {
    help: "Show slash command help",
    status: "Show gateway status summary",
    agent: "Switch agent (or open picker)",
    agents: "Open agent picker",
    session: "Switch session (or open picker)",
    sessions: "Open session picker",
    model: "Set model (or open picker)",
    models: "Open model picker",
    think: "Set thinking level",
    verbose: "Set verbose on/off",
    reasoning: "Set reasoning on/off",
    usage: "Toggle per-response usage line",
    elevated: "Set elevated on/off/ask/full",
    elevAlias: "Alias for /elevated",
    activation: "Set group activation",
    abort: "Abort active run",
    new: "Reset the session",
    reset: "Reset the session",
    settings: "Open settings",
    exit: "Exit the TUI",
    quit: "Exit the TUI",
  },

  // Help text
  help: {
    title: "Slash commands:",
  },

  // Status messages
  status: {
    connecting: "connecting",
    connected: "connected",
    disconnected: "disconnected",
    reconnected: "gateway reconnected",
    gatewayConnected: "gateway connected",
    gatewayDisconnected: "gateway disconnected",
    idle: "idle",
    sending: "sending",
    waiting: "waiting",
    streaming: "streaming",
    running: "running",
    clearedInput: "cleared input",
    pressCtrlCAgain: "press ctrl+c again to exit",
    toolsExpanded: "tools expanded",
    toolsCollapsed: "tools collapsed",
    eventGap: "event gap",
  },

  // TUI labels
  tui: {
    header: "openclaw tui",
    agent: "agent",
    session: "session",
    model: "model",
    think: "think",
    verbose: "verbose",
    reasoning: "reasoning",
    tokens: "tokens",
    context: "context",
    unknown: "unknown",
    global: "global",
  },

  // OAuth messages
  oauth: {
    starting: "Starting OAuth…",
    complete: "OAuth complete",
    failed: "OAuth failed",
    waitingApproval: "Waiting for OAuth approval…",
    timedOut: "OAuth timed out waiting for authorization.",
    openUrl: "Open the following URL to approve access:",
    enterCode: "If prompted, enter the code:",
  },

  // Waiting phrases
  waiting: {
    phrases: [
      "thinking",
      "pondering",
      "contemplating",
      "processing",
      "analyzing",
      "computing",
      "reasoning",
      "deliberating",
    ],
  },
};

export type Translations = typeof en;

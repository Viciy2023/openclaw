/**
 * Chinese (Simplified) language strings
 * 简体中文语言包
 */
import type { Translations } from "./en.js";

export const zh: Translations = {
  // 命令
  commands: {
    help: "显示斜杠命令帮助",
    status: "显示网关状态摘要",
    agent: "切换代理（或打开选择器）",
    agents: "打开代理选择器",
    session: "切换会话（或打开选择器）",
    sessions: "打开会话选择器",
    model: "设置模型（或打开选择器）",
    models: "打开模型选择器",
    think: "设置思考级别",
    verbose: "设置详细模式 开/关",
    reasoning: "设置推理模式 开/关",
    usage: "切换每次响应的使用量显示",
    elevated: "设置提权模式 开/关/询问/完全",
    elevAlias: "/elevated 的别名",
    activation: "设置群组激活方式",
    abort: "中止当前运行",
    new: "重置会话",
    reset: "重置会话",
    settings: "打开设置",
    exit: "退出 TUI",
    quit: "退出 TUI",
  },

  // 帮助文本
  help: {
    title: "斜杠命令：",
  },

  // 状态消息
  status: {
    connecting: "连接中",
    connected: "已连接",
    disconnected: "已断开",
    reconnected: "网关已重连",
    gatewayConnected: "网关已连接",
    gatewayDisconnected: "网关已断开",
    idle: "空闲",
    sending: "发送中",
    waiting: "等待中",
    streaming: "流式传输中",
    running: "运行中",
    clearedInput: "已清除输入",
    pressCtrlCAgain: "再次按 Ctrl+C 退出",
    toolsExpanded: "工具已展开",
    toolsCollapsed: "工具已折叠",
    eventGap: "事件间隙",
  },

  // TUI 标签
  tui: {
    header: "openclaw 终端界面",
    agent: "代理",
    session: "会话",
    model: "模型",
    think: "思考",
    verbose: "详细",
    reasoning: "推理",
    tokens: "令牌",
    context: "上下文",
    unknown: "未知",
    global: "全局",
  },

  // OAuth 消息
  oauth: {
    starting: "正在启动 OAuth…",
    complete: "OAuth 完成",
    failed: "OAuth 失败",
    waitingApproval: "等待 OAuth 授权…",
    timedOut: "OAuth 等待授权超时。",
    openUrl: "打开以下链接进行授权：",
    enterCode: "如有提示，请输入验证码：",
  },

  // 等待短语
  waiting: {
    phrases: [
      "思考中",
      "分析中",
      "处理中",
      "计算中",
      "推理中",
      "斟酌中",
      "考虑中",
      "运算中",
    ],
  },
};

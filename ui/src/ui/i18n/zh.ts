/**
 * Chinese (Simplified) language strings for Web UI
 * 简体中文语言包
 */
import type { UiTranslations } from "./en.js";

export const zh: UiTranslations = {
  // 导航
  nav: {
    chat: "聊天",
    overview: "概览",
    channels: "渠道",
    instances: "实例",
    sessions: "会话",
    cronJobs: "定时任务",
    skills: "技能",
    nodes: "节点",
    config: "配置",
    debug: "调试",
    logs: "日志",
    control: "控制",
    agent: "代理",
    settings: "设置",
  },

  // 通用
  common: {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    add: "添加",
    remove: "移除",
    reload: "重新加载",
    apply: "应用",
    update: "更新",
    close: "关闭",
    confirm: "确认",
    search: "搜索",
    filter: "筛选",
    loading: "加载中...",
    error: "错误",
    success: "成功",
    warning: "警告",
    info: "信息",
    yes: "是",
    no: "否",
    on: "开",
    off: "关",
    enabled: "已启用",
    disabled: "已禁用",
    status: "状态",
    name: "名称",
    description: "描述",
    actions: "操作",
    noData: "暂无数据",
    noChanges: "无更改",
    valid: "有效",
    invalid: "无效",
    form: "表单",
    raw: "原始",
    allSettings: "所有设置",
    language: "语言",
  },

  // 健康状态
  health: {
    ok: "运行正常",
    error: "运行异常",
    checking: "检查中...",
  },

  // 配置页面
  config: {
    title: "配置",
    subtitle: "安全编辑 ~/.openclaw/openclaw.json 文件。",
    settings: "设置",
    searchSettings: "搜索设置...",
    environment: "环境",
    updates: "更新",
    agents: "代理",
    authentication: "认证",
    channels: "渠道",
    messages: "消息",
    models: "模型",
    plugins: "插件",
    session: "会话",
    tools: "工具",
    ackMaxChars: "确认最大字符数",
    activeHours: "活跃时间",
    start: "开始",
    end: "结束",
    timezone: "时区",
  },

  // 渠道
  channels: {
    title: "渠道",
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
    zaloPersonal: "Zalo 个人版",
    webChat: "网页聊天",
    feishu: "飞书",
    wecom: "企业微信",
    nostr: "Nostr",
    configured: "已配置",
    notConfigured: "未配置",
    running: "运行中",
    stopped: "已停止",
    connect: "连接",
    disconnect: "断开",
    login: "登录",
    logout: "登出",
    scanQR: "扫描二维码",
    waitingForScan: "等待扫描...",
  },

  // 聊天
  chat: {
    title: "聊天",
    sendMessage: "发送消息",
    typeMessage: "输入消息...",
    thinking: "思考中...",
    streaming: "流式传输中...",
    abort: "中止",
    newSession: "新会话",
    clearHistory: "清除历史",
    attachFile: "附加文件",
    copyMessage: "复制消息",
    regenerate: "重新生成",
  },

  // 会话
  sessions: {
    title: "会话",
    active: "活跃",
    inactive: "不活跃",
    global: "全局",
    unknown: "未知",
    filterActive: "筛选活跃",
    limit: "限制",
    includeGlobal: "包含全局",
    includeUnknown: "包含未知",
  },

  // 代理
  agents: {
    title: "代理",
    default: "默认",
    custom: "自定义",
  },

  // 定时任务
  cron: {
    title: "定时任务",
    schedule: "计划",
    lastRun: "上次运行",
    nextRun: "下次运行",
    runs: "运行记录",
    create: "创建任务",
    expression: "Cron 表达式",
    command: "命令",
  },

  // 技能
  skills: {
    title: "技能",
    available: "可用",
    installed: "已安装",
    install: "安装",
    uninstall: "卸载",
  },

  // 节点
  nodes: {
    title: "节点",
    connected: "已连接",
    disconnected: "已断开",
  },

  // 调试
  debug: {
    title: "调试",
    status: "状态",
    health: "健康",
    models: "模型",
    heartbeat: "心跳",
    callMethod: "调用方法",
    params: "参数",
    result: "结果",
  },

  // 日志
  logs: {
    title: "日志",
    level: "级别",
    message: "消息",
    timestamp: "时间戳",
    export: "导出",
    autoFollow: "自动跟随",
    filterText: "筛选文本...",
    levels: {
      debug: "调试",
      info: "信息",
      warn: "警告",
      error: "错误",
    },
  },

  // 概览
  overview: {
    title: "概览",
    gateway: "网关",
    version: "版本",
    uptime: "运行时间",
    memory: "内存",
    cpu: "CPU",
  },

  // 实例
  instances: {
    title: "实例",
  },

  // 错误
  errors: {
    connectionFailed: "连接失败",
    loadFailed: "加载失败",
    saveFailed: "保存失败",
    invalidConfig: "配置无效",
    unauthorized: "未授权",
    notFound: "未找到",
    serverError: "服务器错误",
    networkError: "网络错误",
    timeout: "请求超时",
  },

  // 确认
  confirm: {
    delete: "确定要删除吗？",
    reset: "确定要重置吗？",
    logout: "确定要登出吗？",
    discard: "放弃未保存的更改？",
  },

  // 时间
  time: {
    now: "现在",
    seconds: "秒",
    minutes: "分钟",
    hours: "小时",
    days: "天",
    ago: "前",
  },
};

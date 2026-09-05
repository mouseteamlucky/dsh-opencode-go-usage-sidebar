# 验证记录（2026-09-05）

面板恢复后，在两个层面做了验证：

## 1. guard 全量验证（0.1.3-alpha.1 + web-all 0.3.16 整栈）

- `guard verify --static` → 通过
- `guard presets` → 通过（liangshen 双副本一致、无已删 Session API 漂移）
- `guard verify --turn` → 真实回合通过（preset=liangshen, reason=completed）
- 宿主侧同源路由 `/api/opencode-go/usage` → `HTTP 200`，返回官方真实用量（rolling/weekly/monthly）

## 2. 无头浏览器实测（Playwright chromium，headless）

- 打开页面并等待客户端 bundle 装载 → **侧栏会话列表下方出现「OpenCode Go 用量」面板**
- 面板内容：`5小时 0% / 本周 0% / 本月 100%`，三根进度柱、剩余百分比、重置倒计时、刷新按钮、打开订阅页链接；无页面报错。

## 3. 本补丁仓库内容

- `0001-fix-restore-opencode-go-usage-widget-0.1.3-adapt.patch`：完整补丁（两个新包 + ui-workspace 槽位 + web-app/tsconfig 接线 + lockfile）
- `src/`：改动文件的源码镜像，便于人工审阅
- `docs/screenshot.png`：面板渲染截图

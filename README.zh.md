# dsh-opencode-go-usage-sidebar

**简体中文** · [English](README.md)

一个 **内嵌于 DeepSeek Harness 源码**的自定义：在**侧栏会话列表下方**增加一块「OpenCode Go 用量」面板（`sidebar.workspaces.footer` 槽位）。它把作者在升级到 `0.1.3-alpha.1` 之前使用的本地 *opencode usage panel* 恢复并适配到了 0.1.3。

> 这是一个**补丁仓库**，不是可独立安装的插件：它修改 DSH 核心（`packages/client/ui-workspace` 新增侧栏 footer 槽位，`packages/bundle/web-app` 挂两行）。想要可独立安装的悬浮挂件，请用兄弟仓库 [mouseteamlucky/dsh-opencode-go-usage](https://github.com/mouseteamlucky/dsh-opencode-go-usage)。

## 内容包括

- `packages/client/ui-usage` — 浏览器面板（三根竖直用量柱），注册到 `sidebar.workspaces.footer`。
- `packages/host/opencode-usage` — 同源桥路由 `/api/opencode-go/usage`（OpenCode Go bearer token 不出宿主）。
- `packages/client/ui-workspace` — 重建 `sidebar.workspaces.footer` 列表槽位并在会话列表下方渲染。
- `packages/bundle/web-app` — `cordis.patch.yml` 两行 + 依赖。
- 根 `tsconfig.base/client/host` 接线。

## 应用到 0.1.3-alpha.1 checkout

```bash
# 1) 打补丁
git am 0001-fix-restore-opencode-go-usage-widget-0.1.3-adapt.patch
#    （或 git apply 同文件）

# 2) 安装 workspace 依赖
pnpm install

# 3) 构建两个新包 + 改过的 ui-workspace 客户端 bundle
./node_modules/.bin/tsc -b packages/client/ui-usage
./node_modules/.bin/tsc -b packages/host/opencode-usage
pnpm --filter @deepseek-ai/dsh-client-ui-usage run bundle
pnpm --filter @deepseek-ai/dsh-client-ui-workspace run bundle
cd packages/host/opencode-usage && pnpm exec tsdown && cd - >/dev/null

# 4) 重启 DSH（launcher / restart-guarded）并硬刷新（Ctrl+F5）
```

## 验证

见 [VERIFICATION.zh.md](VERIFICATION.zh.md)——静态/preset/真实回合检查全绿，且无头浏览器实测面板渲染（`OpenCode Go 用量` 与滚动/每周/每月三柱）。

## 截图

![侧栏用量面板](docs/screenshot.png)

## 许可证

MIT，见 [LICENSE](LICENSE)。

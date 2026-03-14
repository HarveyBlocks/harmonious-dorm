# 并行开发注意事项（避免 `.next` 冲突）

本文档用于说明：当你本地运行项目测试、同时我也在同一仓库执行构建/调试时，如何避免 `Cannot find module './xxx.js'` 这类 Next.js 构建产物错误。

## 1. 问题根因

- Next.js 默认把产物写到同一个目录：`.next`
- 两个进程同时读写 `.next`（例如一个 `dev`、一个 `build` 或另一个 `dev`）时，可能出现 chunk 被覆盖/删除/半写入
- 常见错误：
  - `Cannot find module './682.js'`
  - `Require stack: ... .next\server\webpack-runtime.js`
  - `/_next/static/chunks/... 500`

## 2. 当前解决方案

项目已支持按环境变量切换构建目录：

- `NEXT_DIST_DIR=.next-user`（你的本地开发）
- `NEXT_DIST_DIR=.next-agent`（代理/自动化任务）

对应脚本：

- `npm run dev:user`：用户端开发（端口 `3000`）
- `npm run dev:agent`：代理端开发（端口 `3011`）

## 3. 推荐启动方式

### 你本地测试

```bash
npm run dev:user
```

### 代理并行工作

```bash
npm run dev:agent
```

这样你们分别读写不同目录，不会互相破坏产物。

## 4. 清理命令

### 清理当前构建目录

```bash
npm run clean:next
```

说明：会清理当前 `NEXT_DIST_DIR`（未设置时清理默认 `.next`）。

### 一次清理全部目录

```bash
npm run clean:next:all
```

会清理：

- `.next`
- `.next-user`
- `.next-agent`

## 5. 日常注意点

- 不要在他人运行 `dev` 时直接手动删除对方正在使用的构建目录
- 如果你只在 `3000` 调试，请固定用 `npm run dev:user`
- 如果出现 `Cannot find module './xxx.js'`：
  1. 停掉所有 Next 进程
  2. `npm run clean:next:all`
  3. 分别重启 `dev:user` / `dev:agent`

## 6. 类型检查说明

`typecheck` 已改为使用 `tsconfig.typecheck.json`，不再依赖 `.next/types`，减少并行时的类型检查误报。

```bash
npm run typecheck
```


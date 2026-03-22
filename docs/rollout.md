# 和谐宿舍项目完整开发日志

## 第一部分：项目初始与技术栈迁移

### 1.1 项目初始清理
- 用户要求删除项目中所有 Google / Gemini 相关内容。
- AI 动作：
  - 删除依赖 `@google/genai`，更新 `package.json` 与 `package-lock.json`
  - 删除 `vite.config.ts` 中的 `GEMINI_API_KEY` 注入
  - 修改 `README.md` 与 `index.html`，移除 AI Studio 相关文字
  - 验证全局无残留，且 `npm run build` 通过

### 1.2 迁移到 Next.js 全栈（首次重构）
- 用户要求：使用 Next.js 完成前后端，界面可适量修改，后端完整测试，文件结构符合 Next.js 规范。
- AI 动作：
  - 删除 Vite 旧结构（`src/`、`vite.config.ts`、`index.html`）
  - 建立 Next.js 14 App Router 目录
  - 创建页面：`/login`、`/`、`/bills`、`/status`、`/profile`
  - 创建 API 路由：
    - `/api/login`
    - `/api/logout`
    - `/api/users/me`
    - `/api/status`
    - `/api/duty`
    - `/api/duty/assign`
    - `/api/duty/complete`
    - `/api/bills`
    - `/api/bills/[id]/pay`
  - 使用 Prisma + SQLite，实现 Cookie Session 鉴权
  - 前端做适量美化（渐变背景、卡片、响应式）
  - 后端测试通过（6 个测试用例）

### 1.3 用户批评“界面完全变了”，要求恢复旧版风格
- 用户指出：界面与旧版相差太大，功能实现不足文档的十分之一。
- AI 修正：
  - 引入 `legacy-dorm-app.tsx` 组件，恢复旧版侧边栏、卡片、弹窗、动效、主题切换
  - 保留 Next.js 全栈，前端接入真实 API
  - 将 `/bills`、`/status`、`/profile` 路由重定向回主页面，统一使用旧版组件
  - 补齐核心功能：登录/注册合一、值日分配/完成、账单创建/支付、状态轮询、个人设置弹窗

---

## 第二部分：核心业务功能扩展

### 2.1 宿舍与用户管理
- **宿舍名可修改**：`PUT /api/dorm`
- **舍长权限可移交**：`POST /api/dorm/transfer-leader`
- **用户信息可配置**：昵称、语言（zh-CN, zh-TW, fr）
- **登录流程简化**：
  - 登录仅用学校邮箱，昵称改为可选（未提供时自动生成）
  - 邀请码仅在“注册模式”显示
  - 登录页移除语言选择
  - 增加登出功能（`POST /api/logout`）和注销账号功能（`DELETE /api/users/me`）
- **邮箱校验放宽**：
  - 后端正则从 `/\.(edu|edu\.cn)$/i` 改为只校验邮箱格式，不限制域名
  - 登录页文案“学校邮箱” → “邮箱”
  - 文件：`lib/validators.ts`、`lib/i18n.ts`

### 2.2 值日系统增强
- **值日可回退**：已完成 ↔ 未完成（`completed` 可切换）
- **值日任务细化**：
  - 数据库扩展：`duties` 表新增 `task` 字段（文本），描述具体任务内容
  - 唯一键调整：从 `(dormId, date, userId)` 改为 `(dormId, date, userId, task)`，支持同一天同一人承担多个不同任务
  - 分配接口 `POST /api/duty/assign` 增加 `task` 入参，校验长度并创建新记录（不再使用 `upsert` 覆盖旧记录）
  - 前端表单新增任务输入框，任务列表展示任务文本
- **交互优化**：
  - 用户要求：点击整张卡片完成/恢复，不通过按钮
  - AI 实现：待完成列表点击卡片完成；完成列表点击卡片恢复未完成
  - 新增删除接口（仅舍长可删）

### 2.3 账单系统增强
- **账单支付可回退**：已支付 ↔ 未支付
- **账单创建错误提示**：前端展示后端返回的错误信息，不暴露栈
- **账单分摊机制增强**：
  - 数据库扩展：在 `bill_participants` 表中新增 `actual_amount` 字段，用于存储每个参与人实际应付金额
  - 分摊逻辑：
    - 创建账单时可选择“平分”或“按权重分摊”
    - 权重为正数（≥0），负数非法；所有权重为 0 时报错
    - 权重归一化后计算每人应付金额，支持金额精确分配（余数按小数部分补齐）
    - 前端实时预览每人应付金额，并随权重输入动态变化
  - 存储与通知规则：
    - 仅 `actual_amount > 0` 的参与人入库，不存储 0 元记录
    - 账单发布通知仅发给实际付费参与人
    - 用户查询账单时，只返回自己 `actual_amount > 0` 的记录
  - 历史数据同步：执行脚本回填旧账单的 `actual_amount`
  - 分摊算法共享：前后端抽离至 `lib/share-allocation.ts`

### 2.4 颜色系统统一
- 创建 `lib/theme/status-colors.ts`，集中管理状态色、账单分类色

### 2.5 多语言支持
- 增加法语、简体中文、繁体中文
- 创建 `lib/i18n.ts`，覆盖界面文案、后端错误消息

### 2.6 数据模型扩展
- 新增字段：
  - `User.language`
  - `Bill.category`、`Bill.customCategory`
  - `ChatMessage`
  - `Notification`
- 通知按用户存储，支持堆叠与精准分发（本人不收到自己触发的通知）

---

## 第三部分：实时通信与通知系统

### 3.1 聊天替代“状态”页
- 移除 10 秒自动更新提示
- 使用 Socket.io 实现实时聊天
- 新增聊天消息存储与 API：`/api/chat`、`/pages/api/socket.ts`
- 聊天中显示“XX 现在是 XX 状态”的系统消息（IM 风格）

### 3.2 通知中心
- **独立页面**：新建 `/notifications` 页面（后来改为侧边栏内嵌）
- **功能**：
  - 支持未读/已读筛选、标记已读、删除
  - 同类型通知合并（`groupKey` + `unreadCount`）
  - 值日/账单/聊天触发通知推送
- **交互改版**：
  - 用户要求：点击卡片即“前往+已读”，去掉“前往”“已读”按钮
  - AI 实现：点击卡片先标记已读，再跳转对应页签
- **批量操作**：
  - 新增“全部已读”功能（后端 `PUT /api/notifications/read-all`）
  - 通知卡片内滚动（外部滚动页面，内部滚动卡片）
  - 左上角菜单缩略（`...`），含全选、取消选择、删除选中、已读选中
  - 每条通知前加自定义 checkbox
  - 选择逻辑：全选前 `include`，全选后取消部分 `exclude`，滚动加载新通知时若全选状态则默认勾选
  - 后端新增批量操作 API `POST /api/notifications/batch`，支持 `read` / `delete`，支持 `selectAll + exclude` 和 `ids` 两种模式
- **自动已读**：
  - 进入聊天页面 → 自动将所有类型为 `chat` 的通知标记已读
  - 进入账单页面 → 自动将类型为 `bill` 的通知标记已读
  - 进入值日页面 → 自动将类型为 `duty` 的通知标记已读
  - 进入设置页面 → 自动将类型为 `settings` 的通知标记已读，并刷新页面数据

---

## 第四部分：交互与视觉反复打磨

### 4.1 深色模式（睡眠模式）可读性修复
- 用户多次指出“背景深但文字灰，看不清”
- AI 多次迭代：
  - 增加背景更深，卡片分三层（near/mid/deep），文字对比度递增
  - 覆盖硬编码的 `text-slate-500` 等类，改用主题变量
  - 深色模式下输入框、辅助文本统一提亮
- **根治方案**：
  - 删除所有基于选择器的“兜底”补丁（如 `.glass-card :where(...)` 强制覆盖）
  - 在根容器 `.app-shell` 设置 `color: var(--text-main)`，使所有未显式指定颜色的元素继承该变量
  - 在 `theme-dark.css` 中，`dark-mode` 类下将 `--text-main` 设为亮色，从而睡眠模式下所有文字默认变为白色
  - 对原生表单控件（`button/input/select/textarea`）添加 `color: inherit; font: inherit;`，确保它们不沿用浏览器默认黑字
- **背景简化**：睡眠模式下背景从渐变改为纯深色 `#010409`

### 4.2 统计图表布局与交互优化
- **用户要求**：
  - 两个统计表上下排布，不左右
  - 折线图不要表格明细
  - 鼠标悬停显示数据（折线图显示该点横纵轴，饼图显示类型和数值）
- **实现**：
  - 上下排布，移除折线图底部的表格列表
  - 折线图悬停点显示 `X: 横轴标签, Y: 值`
  - 饼图悬停块显示类型和金额
- **任务统计增加“完成人占比”饼图**：
  - 新增“完成人占比”饼图（按 `userName` 聚合已完成任务）
  - 三张图上下排布：状态占比、完成人占比、任务趋势折线
- **最终交互增强**：
  - 卡片内图表充分放大，充分利用空间
  - 鼠标移动到元素上时，在鼠标旁弹出卡片显示数据，而非角落
  - 折线图感知点放大（不要过大）
  - 饼图悬停扇区高亮、其他降透明，扇区轻微“弹出”
  - 折线图采用 ECharts 内置 `smooth: true` 实现平滑
  - 折线图加粗（普通模式较粗，全屏模式更粗）
  - 全屏时图表最大化利用空间（`1680x900` 绘图区）
  - 悬停点捕捉范围加大，无需精确点到圆点即可显示 tooltip
- **统计计算移至后端**：
  - 新增 `GET /api/stats/bills` 和 `GET /api/stats/duty`
  - 参数支持 `periodType`（month/quarter/year）、`year`、`marker`、`lineGranularity`（day/month）
  - 返回 `pieData`、`lineData`、`memberPieData`
  - 前端删除本地聚合，改为请求后端 API
  - 文件：`lib/services/stats-service.ts`、两个 stats 路由

### 4.3 设置页布局重构
- **用户批评**：“只有一张卡片，糊弄”
- **AI 重新设计**：
  - 左侧大头像+用户资料，右侧上方宿舍信息，右侧下方账户安全（含退出登录、注销账号）
  - 邀请码展示在宿舍信息中，支持复制
  - 删除底层“设置”标题
- **后续进一步重构**：
  - 设置页改为纯纵向排列（使用者资讯 → 宿舍资讯 → 成员描述 → 宿舍机器人 → 账户安全），移除左右混排
  - 卡片内间距加大，改善阅读体验
  - 非舍长宿舍名只读，改为只读信息块
  - 成员描述卡片层级简化：删除中间层卡片，成员行直接落在外层卡片内，用分割线区分
  - 宿舍机器人卡片改为上中下结构：上为头像+名字，中为机器人设定，下为其他内容
  - 机器人设定键值对样式：
    - 每个键/值输入框独立为卡片风格，删除按钮用 `X` 图标，新增用 `+` 图标
    - 取消键值对整组卡片，删除内部滚动，最多支持 20 条，超限 Toast 提示
    - 输入框阴影缩小，focus 四边统一高亮
  - 机器人头像摄像头图标：修复 z-index 被圆形遮罩问题，改为与“使用者资讯”一致的结构
- **新增“描述”独立卡片**：
  - 位于机器人卡片上方，用户可编辑自己的描述，舍长可编辑所有成员描述
  - 采用自动保存（防抖+离开提交），无需按钮
- **设置卡片折叠/展开功能**：
  - 每个设置卡片可收缩为单行（仅保留标题），用图标代替文字按钮
  - 在 `LegacyDormApp` 中增加 `collapsedSections` 状态与 `toggleSettingsSection` 方法
  - 为五个卡片标题栏右侧添加 `ChevronUp/Down` 图标按钮，点击时切换收缩状态
  - 收缩时仅渲染标题行，其他内容隐藏
  - 除“使用者资讯”外，其他设置卡片默认收起

### 4.4 账单表单布局优化
- **分类选择与描述框联动**：
  - 普通分类不显示描述框；仅当选择“自定义”时，在分类选项下方出现输入框（原在最上方）
  - 自定义分类时，`description` 与 `customCategory` 使用相同文本，提交后统一处理
- **权重输入框样式降级**：
  - 去掉“卡片感”，缩小尺寸，与同排元素风格统一
  - 去掉所有 number 输入框右侧的上下增减按钮（全局样式）
  - 参与人权重默认值改为 `1`，不再依赖占位词显示
  - 参与人标签左右内收（`px-2`），外层宽度不变
- **权重 0 的合法化**：
  - 权重可为 0（表示不出钱），负数非法
  - 预览时若所有权重为 0，自动回退为平分（避免全 0 显示）
  - 提交时若所有权重为 0，报错阻止创建
- **“应付”文案删除**：成员旁只显示金额，不再显示“应付”二字

### 4.5 值日看板布局调整
- **合并为“本周值日看板”**：
  - 将“待完成任务”与“已完成列表”合并为一个大卡片，左右排布
  - 移除无意义的“收起/展开全部”按钮
- **非舍长隐藏“仅舍长可分配值日”卡片**：
  - 非舍长时隐藏整个分配卡片
  - 任务区从 `lg:col-span-2` 自动扩展为 `lg:col-span-3`

### 4.6 聊天界面 UI 优化
- **用户名位置调整**：将用户名从气泡内部移到气泡外、头像旁
- **字体放大**：用户名、消息文本、输入框字号统一增大
- **换行发送**：
  - `Enter` 发送消息，`Ctrl+Enter`（或 `Cmd+Enter`）插入换行
  - 修复发送后换行被 HTML 折叠的问题，改用 `whitespace-pre-wrap`
- **聊天输入框多行支持**：改用 `textarea`
- **上下文标记图标**：移到气泡外侧（左侧消息在气泡右边，右侧消息在气泡左边）
- **机器人流式转圈**：移到气泡外侧，不再占用气泡内空间
- **右键/长按菜单**：
  - 支持鼠标右键和移动端长按触发
  - 菜单位置贴近指针（通过 `createPortal` 和视口边界修正）
  - 菜单项：未标记消息显示“加入机器人记忆”，已标记消息显示“取消加入记忆”；“设为隐私/取消隐私”
  - 菜单滚动时关闭，避免位置漂移
- **“停止生成”按钮**：
  - 从菜单移至机器人消息右下角，使用圆形 `Pause` 图标（库内置），颜色跟随主题 `--accent`，置于气泡右侧功能栏底部

### 4.7 聊天滚动与分页
- **双向分页**：
  - 触顶加载更旧消息，触底加载更新消息
  - 修复触顶加载后不显示的问题，改用滚动位置恢复机制
- **“到上次位置”重写**：
  - 基于未读聊天通知的最早时间，请求锚点窗口（前后各 10 条），直接定位
  - 仅当未读消息 > 20 条时显示按钮
  - 定位后支持双向滚动加载
- **新消息智能滚动与计数**：
  - 用户在底部时，新消息自动滚动到底部
  - 用户不在底部（翻看历史）时，新消息仅追加，不抢焦点
  - 右下角出现倒置水滴状计数按钮，显示新消息数（超过 99 显示 `99+`）
  - 点击计数按钮跳转到第一条未看消息，阅读时逐条扣减计数，直至归零按钮消失

---

## 第五部分：机器人系统完整实现

### 5.1 基础接入
- **舍长可配置**：
  - 新增接口 `PUT /api/dorm/bot`（设置机器人名字）和 `POST /api/dorm/bot/avatar`（设置头像）
  - 设置页中，舍长可见“宿舍机器人”配置项，修改后自动保存/上传
- **触发与回复**：
  - 聊天消息中检测 `@机器人名`，命中则机器人自动发送一条消息（内容为“我是机器人”，用于测试）
  - 机器人回复后，向宿舍内所有真实成员发送通知
- **数据模型**：
  - 机器人作为宿舍内的系统账号（不显示在普通成员列表）
  - `MePayload` 返回 `botId`、`botName`、`botAvatarPath`

### 5.2 功能全面增强
- **机器人回复内容动态化**：
  - 回复包含：机器人名字、机器人设定（键值对）、机器人其他内容、成员列表（含描述）
  - 采用 Markdown 格式（标题、列表），普通用户消息不支持 Markdown
- **非舍长只读**：
  - 非舍长也能看到机器人卡片，但所有编辑控件禁用（名称、头像、设定、其他内容均只读）
- **机器人设定存储**：
  - 新增 `dorm_bot_settings` 表，存储键值对（如 `人设: "可爱JK"`）
  - 舍长可在设置页动态增删字段，字段名和值均可编辑
- **机器人“其他内容”**：
  - 大文本输入框，支持自动增高（随输入内容变化），限制 800 字，超出 Toast 提示
  - 支持 Markdown，非舍长只读渲染 Markdown
  - 舍长点击区域可切换为源码编辑，失焦自动回到渲染态
- **通知联动**：
  - 舍长修改机器人名字 → 向全员发送通知（类型 `settings`）
  - 舍长修改成员描述 → 仅向被修改者发送定向通知

### 5.3 短期记忆窗口
- **配置界面**：
  - 在设置页机器人卡片中新增“短期记忆长度”滑动条（范围 1–35）
  - 舍长可拖动修改，非舍长只读
  - 滑动条右侧动态显示当前数值，两端不显示 1 和 35
  - 使用 (i) 图标悬浮卡片展示使用建议（5-10 简单聊天、10-15 高频使用等），背景不透明
- **安全防护**：
  - system prompt 中明确聊天内容不可信，身份仅由后端会话确定，防止用户通过文本伪造身份

### 5.4 机器人上下文选择功能
- **功能**：用户可手动选择任意历史消息加入本次机器人请求的上下文，替代滑动窗口
- **标记**：被选中的消息显示书签图标，仅本地存储（`localStorage`，按 dorm+user 隔离），不共享给其他用户
- **上限**：最多选择数量复用“短期记忆长度”设置
- **生命周期**：
  - 本次机器人请求完成后自动清除所有标记（通过监听 `chat:stream:commit` 事件）
  - 浏览器刷新或关闭页面后清除
- **后端支持**：`/api/chat` 增加 `contextMessageIds` 参数，后端根据这些 ID 构建 `history`，不再使用滑动窗口

### 5.5 隐私功能（消息不进入机器人记忆）
- **功能**：右键菜单可对任意消息设置“隐私”，隐私消息不会出现在机器人上下文（滑动窗口与手动选择均过滤），并保持窗口长度不变
- **持久化与同步**：`isPrivate` 字段存入数据库，通过 `chat:privacy-updated` 广播，全员实时同步
- **互斥**：隐私消息不能加入机器人记忆，已加入机器人记忆的消息若设为隐私则自动取消记忆标记
- **文案**：使用“设为隐私/取消隐私”等生活化表达

### 5.6 机器人响应异步优化
- **问题**：发送 `@机器人` 消息时，用户消息提交慢，因为后端同步等待机器人入队、创建占位、推送通知等操作
- **解决方案**：
  - 将机器人准备与入队、通知推送等操作放到 `setTimeout(..., 0)` 后台异步执行，不阻塞主请求
  - 主请求只做用户消息入库和 `chat:new` 广播，立即返回
  - 用户发送 `@机器人` 后，消息快速显示，机器人占位气泡和转圈随后由 `chat:stream:start` 推送到达
- **效果**：用户体验接近普通聊天速度，不再等待机器人模型

### 5.7 机器人流式消息交互重构
- **占位气泡先落库（解决刷新后顺序错乱）**：
  - 机器人任务入队时立即向数据库插入一条占位消息（`content: ''`），获得真实 `id`
  - 流式 `start` 事件使用该真实 `id` 广播，前端气泡即基于真实 ID 显示
  - 机器人回复完成后 `update` 同一条记录，不再创建新消息，刷新后顺序稳定
- **流式滚动行为**：
  - 用户在底部时：机器人气泡高度变化时持续贴底，气泡向上增长，底边不动
  - 用户不在底部时：页面不自动滚动，保持当前阅读位置，气泡向下增长，不打断阅读
  - 通过 `use-chat-layout-sync.ts` 监听 `liveContentVersion`（内容变化但条数不变）驱动布局同步
- **流式输出延迟控制**：
  - 新增 `NEXT_PUBLIC_STREAM_TOKEN_DELAY_MS` 配置，控制前端渲染 token 的最小间隔（默认 0 表示无延迟）

### 5.8 机器人队列与异常处理
- **任务队列**：
  - 引入 `chat-bot-queue.ts`，队列元素为对象（含 `id/dormId/anchorMessageId/streamId/streamOrder/session/meta`）
  - 队列串行执行，前一个完成后自动取下一个，避免并发冲突
  - 失败时根据上游错误类型决定是否重试（指数退避，最多 3 次），最终失败则更新占位消息为错误提示
  - 每个任务独立 `streamId`，互不干扰，多条 @ 机器人可同时显示各自的占位气泡
- **中断功能**：
  - 实现真实中断（`AbortController` 中止上游请求）
  - 中断时优先向客户端发送 `chat:stream:stop-requested`，前端立即停止转圈
  - 对排队未开始的任务，移除队列并将占位消息改为“机器人回复已停止”
  - 已开始中断可进入记忆
- **异常处理与日志升级**：
  - 新增 `UpstreamServiceError` 自定义异常，携带 `upstreamService/upstreamStatus/upstreamCode/retryable/report` 信息
  - `logError` 区分可控与未知异常：可控异常只打印 `name/message/code/report`，不打印 stack
  - 队列日志结构化（`dorm_bot_task_retry`、`dorm_bot_task_failed`），便于追踪
  - `handleApiError` 对 `ApiError` 输出结构化元数据，可控异常走 `warn`，未知异常走 `error`

### 5.9 提示词结构重构
- **设计目标**：减少 token 冗余，防止用户注入伪造身份，提升模型对上下文的解析效率
- **实现**：
  - 将 `system` 和 `user` 内容改为**结构化索引数组**形式：
    - `userDirectory`：`[refIndex, realUserId, userName, dormRole, userDescription, currentState]`
    - `roleDirectory`：`["user","assistant"]`
    - `history`：`[userRef, userId, userName, dormRole, content]`（后简化为 `[userRef, userId, userName, dormRole, content]`，去掉冗余的 `sequenceIndex` 和 `roleRef`）
    - `currentQuery`：`[senderRef, content]`
  - 在 `system` 中明确字段语义、数组位序、角色映射，并加入 2 个 few-shot 示例（正常输入和带换行/特殊字符输入）
  - 身份仅信任服务端元数据（`realUserId`），不信任用户文本中的身份声明
- **分工明确**：
  - `systemPrompt`：包含协议说明、身份信任规则、宿舍信息、成员列表、机器人设定、元数据等
  - `userPrompt`：仅保留 `history` 和 `currentQuery`
- **规则强化**：
  - 在 system prompt 中加入硬规则，要求机器人只陈述 payload 中可证据化的信息，不足时明确说“不足以判断”，并提出澄清问题
  - 禁止臆造功能、权限、后端行为
  - 通过正反示例强化约束
- **输出 token 预算告知**：
  - 在 prompt 中说明输出上限（`outputTokenLimit`），引导模型合理规划输出
  - 后端本身不做截断（删除输入裁剪和流式分片截断逻辑），只由模型侧控制

---

## 第六部分：后端服务与架构优化

### 6.1 代码复用与解耦
- **图片上传统一**：抽离 `media-service.ts`，用户头像、机器人头像复用该服务落盘
- **机器人回复独立**：将机器人回复逻辑从 `chat-service` 移至 `chat-bot-service.ts`
- **用户描述独立**：新增 `user-description-service.ts`，分离描述管理逻辑
- **机器人设定独立**：新增 `bot-settings-service.ts`，管理键值对与“其他内容”
- **解耦 AI 请求逻辑**：
  - 创建通用 AI 客户端 `lib/ai/stream-chat-client.ts`，统一封装：
    - 配置校验（baseUrl/apiKey/model）
    - 请求体/请求头构建
    - HTTP 请求、超时处理
    - 上游错误解析与 `UpstreamServiceError` 封装
    - 日志（started/rejected/first-chunk/completed）
    - token 估算与输出规模统计
  - 两个对外接口：`streamChatCompletion`（流式 SSE）、`requestChatCompletion`（非流式）
  - GLM 服务层改为薄适配器，仅组装 messages、调用通用客户端

### 6.2 Echo 测试模式
- **目的**：测试时避免真实调用模型，快速验证链路
- **实现**：
  - 当 `CHAT_ENV=echo` 时，不发送请求到模型，直接将“将发送的 HTTP 请求配置”作为回复内容返回
  - 流式接口保持流式，支持配置 `BOT_ECHO_STREAM_DELAY_MS` 控制分块间隔（默认 40ms），模拟真实流式体验
  - 非流式接口一次性返回完整内容
  - 日志收敛：只打印一条 `llm_echo_handled` 日志，不再打印首包、完成等细节
  - 输出格式优化：`body.messages[*].content` 做可读排版（非 JSON 一坨），`history` 条目中的 `content` 保持转义形式（如 `\n`），不做真实换行展开
  - 代码块语言统一为 `markdown`

### 6.3 日志系统优化
- **LLM 调用日志**：增加 `llm_request_started`、`llm_first_stream_chunk`、`llm_stream_completed` 三段日志，记录 traceId、首包延迟、总耗时、估算 token 等
- **控制台输出策略**：
  - 普通日志（info/warn）控制台单行 JSON，便于检索
  - 异常堆栈时控制台多行美化，便于排查
- **日志落盘**：确认日志文件路径为 `%TEMP%\harmonious-dorm\backend.log`
- **消除视觉噪音**：修复日志中因控制字符导致的“大量空白”视觉问题

### 6.4 后端 API 错误处理
- 所有 API 统一返回 `{ message }`，不暴露异常栈
- 前端使用 `toast` 显示后端错误消息
- 在 `client-api.ts` 中统一处理 401，避免反复跳转

### 6.5 数据库模型扩展
- 新增表：
  - `user_descriptions`：存储用户描述（`userId`, `description`）
  - `dorm_bot_settings`：存储机器人设定键值对（`dormId`, `key`, `value`, `orderNo`）
- Dorm 表扩展：增加 `botName`、`botAvatarPath` 字段
- 通知表：增加 `type` 字段（`chat`/`bill`/`duty`/`settings`）

### 6.6 数据造数与修复
- **数据造数**：
  - 用户 100 左右，宿舍 20，宿舍人数 2-6 不等，用学校邮箱唯一标识
  - 创建 `scripts/seed-large-data.cjs`，生成：
    - 宿舍 20
    - 用户 100
    - 值日 15700
    - 账单 3700
    - 聊天 8000
  - 时间范围：2023-03-14 至 2026-03-14
- **为 D0003 宿舍灌入大量数据**：
  - 账单 1200
  - 聊天 12000
  - 值日 6000
  - 通知 480
- **数据库枚举值英文化**：
  - 编写脚本 `scripts/migrate-enum-values.cjs`，将 `status.state`（学习/睡觉/游戏/外出）迁移为英文 `study/sleep/game/out`（102 行），`bill.category`（电费/水费/网费/日用品/其他）迁移为英文（4721 行）
- **SQLite 日期格式不一致修复**：
  - 问题：用户手动修改 SQLite 中 `users.created_at` 为文本日期（`'2026-03-15 11:29:58.291'`），导致 Prisma 读取时报错
  - 修复：编写独立脚本 `repair-user-name-from-sqlite.cjs`，将受影响行的 `created_at` 恢复为毫秒时间戳整数，同时保留用户名

---

## 第七部分：性能优化与错误修复

### 7.1 反复 Rebuilding 问题根治
- **根因定位**：
  1. 后端日志写项目目录 `logs/backend.log` 被 Next watcher 监听
  2. SQLite 数据库文件 `dev.db` 及其 journal/wal/shm 持续变更触发重编译
- **修复**：
  - 后端日志改写到系统临时目录（`%TEMP%\harmonious-dorm\backend.log`）
  - `next.config.js` 增加忽略：从 `DATABASE_URL` 动态解析 SQLite 文件路径，只排除该文件及其 sidecar，并增加忽略 `.tmp/` 目录
  - 合并 `ignored` 规则时保留默认的 `node_modules` 忽略

### 7.2 WebSocket 连接问题
- **问题**：`/api/socket` 返回 400，连接反复失败
- **根因**：普通 `GET /api/socket` 被当成 Socket.IO 握手流量，参数不全；服务端与客户端路径不一致
- **实现**：
  - 服务端 Socket.IO 传输路径改为 `/api/ws`
  - 前端连接改为 `/api/ws`，保留一次 `/api/socket` 初始化
  - 统一路径后消除 400/404 错误
  - 增加连接门禁（同 dorm 已连接不重复初始化）和失败冷却（5 秒内不重试），避免请求风暴

### 7.3 登录与认证修复
- **登录后 401 循环请求**：
  - 原因：API 返回 401 时前端无限重试
  - 修复：
    - 在 `client-api.ts` 中 401 时跳转 `/login`
    - 在 React Query 配置中禁止对 4xx 重试
    - 在 `LegacyDormApp` 中等待 `authReady` 再发起数据请求
    - 增加重定向锁 `__APP_LOGIN_REDIRECTING__`，避免并发跳转
    - 登录页加载时重置 `markAppNavigating(false)` 并清除锁
- **登出后 RSC payload 错误**：
  - 登出/注销成功后：断开 WebSocket，清空查询缓存
  - 改用 `window.location.assign('/login')`，避免 `router.refresh()` 触发 RSC 竞争

### 7.4 并行开发缓存冲突
- **问题**：同时开发导致 `.next` 产物损坏，出现 `Cannot find module './682.js'` 错误
- **实现**：
  - `next.config.cjs` 支持 `NEXT_DIST_DIR` 环境变量，分开构建目录
  - 新增 `tsconfig.typecheck.json`，避免类型检查依赖 `.next/types`
  - 新增脚本：
    - `dev:user` → `.next-user`，端口 3000
    - `dev:agent` → `.next-agent`，端口 3011
    - `clean:next:all` 清理所有构建目录
  - 新增文档 `docs/Parallel-Dev.md`

### 7.5 生产部署优化
- **Standalone 部署资源缺失**：
  - 问题：`output: 'standalone'` 生成的 `standalone` 目录缺少 `static` 和 `public` 文件
  - 修复：新增脚本 `prepare-standalone.cjs`，自动同步 `.next/static` 和 `public` 到 `.next/standalone/.next` 及对应位置，并更新 `start:standalone` 命令

### 7.6 其他修复
- **`layout.js` 语法错误**：添加 `clean:next` 脚本，使用 `npm run dev:clean` 清理并重启
- **Socket 初始化 400 错误**：接口改为始终返回 200，前端增加重试与降级
- **数据库约束错误**：`dorm_bot_settings.updated_at` NOT NULL 约束失败，将 raw SQL 操作改为 Prisma 模型读写，避免脆弱性
- **Maximum update depth exceeded**：修复 `useMeSyncState` 中对象状态无条件 `setState` 导致的无限循环
- **饼图重复 key 报错**：在 `pie-chart-card.tsx` 中将 `key` 改为稳定唯一值 `sliceKey = `${index}-${slice.label}-${slice.value}``
- **自定义分类聚合**：后端 `stats-service.ts` 增加聚合逻辑：自定义分类占比 < 5% 时合并到统一 `other`，≥5% 保留原文本
- **账单支付/恢复支付路由参数**：修复 Next 16 动态路由同步读取问题，改为 `await params`
- **值日任务权限**：后端实现舍长可标记任何人，普通成员只能标记自己
- **Toast 渲染异常**：移除 updater 回调内的 `toast` 调用，改为事件路径触发

---

## 第八部分：代码质量与规范

### 8.1 国际化规范统一（消除中文标识符）
- **问题**：代码中存在中文键名、枚举值、变量名
- **修复**：
  - 状态映射：将 `if (state === 'study') return '学习'` 这类硬编码改为英文状态码 `study/sleep/game/out`，前端按语言本地化显示
  - 后端状态消息：改为结构化格式 `__status_change__:<user>:<out|study|sleep|game>`，前端解析后根据语言渲染
  - 对象字面量键名：将 `localizeServerText` 中的中文键（如 `新账单已发布`）改为英文键（如 `newBillPublished`）
- **通知系统彻底解耦**：
  - 后端改为发送 `messageKey + params`（结构化 token），前端根据当前语言渲染，不再依赖中文文案识别
  - 新增 `NoticeMessageKey` 枚举，集中定义所有通知语义
  - 所有后端服务（bill/chat/duty/dorm/bot/user）的通知发送统一使用枚举
  - 前端适配层 `i18n-adapter.ts` 改为调用 `localizeNoticeToken`
- **删除所有文本正则解析**：移除 `text.match(/^...中文...$/)` 这类逻辑，统一使用 token 判断

### 8.2 巨石组件拆分
- **目标**：将 3300+ 行的 `legacy-dorm-app.tsx` 拆分为多个小文件（每文件 ≤300 行，每函数 ≤50 行）
- **实施步骤**：
  - 第一轮（基础层与图表组件）：
    - 新建目录 `components/legacy-app/`，抽出：
      - `types.ts`：组件内类型定义
      - `constants.ts`：常量（如导航选项、图表默认配置）
      - `helpers.ts`：工具函数（格式化、日期处理等）
      - `localization.ts`：本地化文案映射与语言相关辅助
      - `fold-icon.tsx`：折叠/展开按钮图标组件
      - `nav-button.tsx`：侧边栏导航按钮组件
      - `charts/pie-chart-card.tsx`、`charts/line-chart-card.tsx`
  - 第二轮（业务模块组件化）：
    - 抽出通知页为独立组件：`tabs/notifications-tab.tsx`
    - 抽出设置卡片公共模板：`settings-section.tsx`
  - 第三轮（页面级组件）：
    - `dashboard-tab.tsx`、`chat-tab.tsx`、`wallet-tab.tsx`、`duty-tab.tsx`
  - 第四轮（设置页组件）：
    - `user-settings-section.tsx`、`dorm-settings-section.tsx`、`member-settings-section.tsx`、`bot-settings-section.tsx`、`security-settings-section.tsx`
  - 第五轮（业务逻辑 Hooks）：
    - `use-dorm-socket.ts`
    - `use-settings-auto-save.ts`
    - `use-infinite-scroll-trigger.ts`
    - `use-chat-window.ts`
    - `use-chat-input.ts`
    - `use-tab-auto-read.ts`
    - `use-tab-prefetch.ts`
    - `use-domain-mutations.ts`
    - `use-settings-mutations.ts`
    - `use-notice-auth-mutations.ts`
    - `use-legacy-queries.ts`
    - `use-me-sync-state.ts`
  - 第六轮（视图模型）：
    - `view-models.ts`：集中管理页面文案映射，通过字典驱动替代分散的三元链
- **最终状态**：
  - 主文件从 3300+ 行降至 1081 行
  - 每个拆分后文件均小于 300 行，函数均小于 50 行
  - 所有业务功能保持不变

### 8.3 命名清理与结构重组
- 将 `legacy-app`、`legacy-dorm-app` 等过时命名改为 `dorm-hub`
- 摒弃机械拆分，将 God Hook `use-dorm-hub-page-model` 拆为：
  - `use-dorm-hub-chat-runtime.ts`（聊天运行时）
  - `use-dorm-hub-lifecycle-effects.ts`（生命周期副作用）
  - `build-dorm-hub-lifecycle-options.ts`（参数构建）
  - `create-dorm-hub-layout-props.ts`（布局 props 组装）
- i18n 大文件拆为“薄入口 + JSON 数据文件”，如 `ui-texts.ts`（8行）和 `ui-texts.data.json`

### 8.4 Git 管理规范化
- 更新 `.gitignore`，加入 `.next-user`、`.next-agent` 等构建目录（含带空格目录名），并清理已被 Git 跟踪但应忽略的备份文件
- 从 Git 跟踪中移除不应提交的文件（`.env.example`、`tsconfig.tsbuildinfo`、`tsconfig.typecheck.tsbuildinfo`）
- 明确 `.env` 为运行时配置，已加入 `.gitignore`，删除 `.env.example`

### 8.5 清理与规范
- **移除中文注释**：全量扫描代码注释，确保无中文注释残留
- **删除冗余兼容逻辑**：删除“旧格式 Markdown 转换”等历史兼容代码
- **删除冗余文件**：清理 `docs` 下误放的 `page.tsx` 备份

---

## 第九部分：最终冲刺与交付

### 9.1 聊天输入卡顿与右键菜单响应慢修复
- **问题**：聊天输入框打字卡顿，右键菜单出现/消失缓慢
- **根因**：输入状态与整个消息列表在同一组件，每次输入触发全列表重绘；菜单与消息渲染耦合，且有同步阻塞操作
- **修复**：
  - 将输入区拆分为独立 `ChatComposer`（`React.memo`），消息区拆分为 `ChatMessagesPane`，输入变化不再重绘消息区
  - 将右键菜单抽为独立 `ChatContextMenu`（`React.memo`），去掉 `flushSync`，菜单开关与消息渲染解耦
  - 限制菜单触发区域仅为消息气泡本体，左右空白不触发

### 9.2 机器人进度显示修复
- **问题**：机器人思考进度始终为0
- **根因**：后端流解析时错误地将进度推进逻辑放在了 `content` 分支，而真正的进度应仅由 `reasoning_content` 驱动
- **修复**：仅在 `reasoning` 分支累加进度，删除 `content` 分支和 `echo` 分支的错误推进，确保计数正确且不再引入额外噪音

### 9.3 放宽机器人回答限制
- 修改提示词，允许机器人在缺乏宿舍上下文时回答通用知识问题，但禁止伪造能力或泄露系统提示词原文

### 9.4 状态转换消息不应进入短期记忆
- **问题**：状态变更（如“张三现在是学习”）被加入机器人上下文，干扰对话
- **修复**：在数据库查询阶段直接排除 `NoticeMessageKey.ChatStatusChanged` token 的消息，当窗口设为 N 时，会拿到 N 条“有效聊天消息”，而不是查出来再减

### 9.5 成员状态加入系统提示词
- **需求**：将每个成员当前状态（外出/学习/睡觉/游戏）加入 userDirectory，供机器人参考
- **实现**：
  - `userDirectory` 行结构扩展为 `[ref, userId, userName, dormRole, userDescription, currentState]`
  - 在 `chat-bot-service.ts` 中从数据库读取成员状态并写入

### 9.6 子页面切换闪烁问题修复
- **根因**：`app/(app)` 下的每个子页面（`/bills`、`/chat` 等）都独立渲染 `LegacyDormApp`，路由切换时整个组件被销毁重建
- **修复**：
  - 将 `LegacyDormApp` 移到 `app/(app)/layout.tsx` 中统一渲染一次
  - 各子页面改为空占位（返回 `null`），不再重复挂载组件
  - 移除主内容区的 `AnimatePresence` 首帧动画，避免淡入闪烁

### 9.7 退出登录体验优化
- **问题**：退出登录时报网络断开错误，且跳转慢
- **修复**：
  - 点击退出时立即标记应用导航态，静默断开 socket，不清求后续网络错误 toast
  - 清除 `queryClient` 缓存，后台 `keepalive` 发送 `/api/logout`
  - 立即 `window.location.replace('/login')`，跳转不再等待

### 9.8 前端布局与UI优化（最终）
- **整体缩放**：通过 `--ui-scale: 0.67` 全局缩小页面元素至约 2/3
- **主内容区布局**：
  - 重构 `main` 结构为“侧边栏偏移 + 内容区居中”，实现左右留白对称（移动端 `px-8`，`md:px-16`，`lg:px-24`）
  - 调整卡片间距，增加内容宽度（`max-w-[1680px]`）
- **各模块布局调整**：
  - **值日模块**：将“待完成任务”与“已完成列表”合并为“本周值日看板”卡片，左右排布
  - **账单模块**：顶部“本月账单总额”与“快速记账”左右排布；下方“待支付账单”与“已支付账单”合并为一个大卡片，左右排布并提高高度
  - **首页**：`md` 下两个卡片左右排布
  - **聊天卡片**：增加低高度 topbar（渐变分隔），加大消息字体（`text-base`），降低输入区高度（`rows=1`，减少内边距）
  - **通知中心**：默认筛选为“未读”，提高可用高度，减少底部空白

### 9.9 验证与最终状态
- **类型检查**：`npm run typecheck` 始终通过
- **后端测试**：`npm run test:backend` 6/6 通过
- **生产构建**：`npm run build` 通过
- **开发环境**：`dev:user` / `dev:agent` 可正常启动，不再出现反复 rebuilding 和 websocket 连接失败
- **功能完整性**：所有业务功能（账单权重分摊、值日 task、分类描述、聊天滚动分页、通知自动已读、设置自动保存、机器人流式回复、隐私消息、手动选择上下文等）全部保留且正常工作

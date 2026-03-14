# 和睦寝室（HarmoniousDorm）

## 1. 项目概述

和睦寝室是一个面向校园宿舍内部协作的轻量级 Web 应用，旨在通过可视化的方式帮助同一宿舍的成员协调值日、分摊费用、同步作息状态，减少沟通成本。  
**核心要求**：不同宿舍的数据严格隔离；用户需通过简单的注册/登录机制进入自己的宿舍空间；所有实时性要求不高的更新均通过**轮询策略**实现。

## 2. 技术栈

| 层次     | 技术                                             | 说明                                 |
| -------- | ------------------------------------------------ | ------------------------------------ |
| **框架** | Next.js 14 (App Router)                          | 全栈 React 框架，集成服务端与客户端  |
| 语言     | TypeScript                                       | 强类型支持                           |
| 包管理   | npm                                              | 依赖管理                             |
| UI 组件  | 自研 + Ant Design（可选）                        | 快速搭建界面                         |
| 状态管理 | React Query + Context                            | 数据获取与共享（客户端）             |
| 路由     | Next.js 文件系统路由                             | 自动路由，支持布局嵌套               |
| 轮询     | `setInterval` / React Query 的 `refetchInterval` | 模拟实时更新                         |
| **后端** | Next.js API Routes (Route Handlers)              | 在同一个项目中实现 API 逻辑          |
| 数据存储 | SQLite + Prisma ORM                              | 嵌入式数据库，通过 Prisma 访问与迁移 |
| 认证     | 基于 Cookie 的简易 Session                       | 登录后将用户信息存入加密 Cookie      |
| 通信     | RESTful API + JSON                               | 前后端数据交换                       |

> **说明**：Next.js 全栈架构使得前端页面和后端 API 位于同一代码库中，简化部署，并支持服务端渲染（SSR）与静态生成（SSG）。开发时使用 SQLite 作为数据库，生产环境可无缝切换为其他关系型数据库（如 PostgreSQL）。

## 3. 用户与宿舍模型

### 3.1 用户身份与宿舍隔离

- **用户**：每个用户有一个唯一 ID、昵称、所属宿舍 ID。
- **宿舍**：每个宿舍有一个唯一 ID、宿舍名称（如“3-101”）、邀请码（用于加入）。
- **隔离原则**：所有业务数据（值日、账单、状态）均关联到**宿舍 ID**，API 请求通过 Cookie 携带的用户标识确定宿舍。

### 3.2 注册/登录流程

由于不考虑安全，采用最简单的**用户名 + 宿舍邀请码**登录：

1. **注册/登录合一**：用户输入昵称和宿舍邀请码。
   - 如果邀请码存在，则将用户加入该宿舍（若昵称已存在则直接登录）。
   - 如果邀请码不存在，则创建新宿舍，并以此用户为宿舍长（可选角色）。
2. 后端验证成功后，将用户 ID 和宿舍 ID 写入加密 Cookie，后续请求自动携带。
3. 前端通过 Cookie 保持登录状态，无需手动存储 token。

### 3.3 数据库表设计（含用户与宿舍）

使用 Prisma Schema 定义（此处以 SQL 表示，实际在 `schema.prisma` 中定义）：

```sql
-- 宿舍表
CREATE TABLE dorms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,           -- 例如 "3-101"
  invite_code TEXT UNIQUE NOT NULL  -- 随机生成，用于加入
);

-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dorm_id INTEGER NOT NULL REFERENCES dorms(id),
  is_leader BOOLEAN DEFAULT 0,   -- 可选：是否为舍长
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 值日记录表
CREATE TABLE duties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dorm_id INTEGER NOT NULL REFERENCES dorms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  image_url TEXT
);

-- 账单表
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dorm_id INTEGER NOT NULL REFERENCES dorms(id),
  total_amount REAL NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账单参与人表
CREATE TABLE bill_participants (
  bill_id INTEGER REFERENCES bills(id),
  user_id INTEGER REFERENCES users(id),
  paid BOOLEAN DEFAULT 0,
  PRIMARY KEY (bill_id, user_id)
);

-- 状态记录表（每个用户最新状态）
CREATE TABLE status (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  state TEXT CHECK(state IN ('学习','睡觉','游戏','外出')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> 注：所有业务表均包含 `dorm_id` 字段，确保数据隔离。查询时后端需根据当前用户的 `dorm_id` 过滤。

## 4. 页面设计与交互流程

### 4.1 整体路由（Next.js 文件系统路由）

| 路径       | 页面文件               | 说明                   |
| ---------- | ---------------------- | ---------------------- |
| `/login`   | `app/login/page.tsx`   | 登录/注册页            |
| `/`        | `app/page.tsx`         | 默认首页，展示本周值日 |
| `/bills`   | `app/bills/page.tsx`   | 账单管理页面           |
| `/status`  | `app/status/page.tsx`  | 状态同步页面           |
| `/profile` | `app/profile/page.tsx` | 个人中心页面           |

> 所有页面均通过布局（`app/layout.tsx`）包含全局导航栏，并在服务端校验登录状态，未登录重定向至 `/login`。

### 4.2 登录/注册页面

**设计目标**：极简，一键进入。

- **页面元素**：
  - 大标题“和睦寝室”
  - 昵称输入框（必填）
  - 宿舍邀请码输入框（可选）
  - 按钮：“进入宿舍”（若邀请码为空则创建新宿舍）
- **交互流程**：
  1. 用户输入昵称“张三”，邀请码为空，点击按钮。
  2. 调用 API `POST /api/login`，后端生成新宿舍（随机邀请码如 `A1B2C`），创建用户并设为舍长。
  3. 后端将用户信息写入 Cookie，返回成功响应，前端跳转至首页。
  4. 若邀请码存在，后端验证并将用户加入该宿舍（若昵称已存在则直接登录），同样设置 Cookie。

### 4.3 值日看板页面

页面设计与之前一致，但数据获取时后端自动根据当前用户宿舍返回。

**新增**：舍长权限控制（可选）——只有舍长可拖拽分配值日，普通成员只能查看和完成自己的值日。

**轮询**：使用 React Query 的 `refetchInterval` 每 30 秒刷新值日列表。

### 4.4 账单管理页面

- 创建账单时，参与成员列表自动加载同宿舍成员。
- 历史账单仅显示当前宿舍的。

**轮询**：每 60 秒刷新账单列表。

### 4.5 状态同步页面

- 显示当前宿舍所有成员的最新状态。
- 切换状态后调用 API 更新，轮询每 10 秒拉取最新。

### 4.6 个人中心页面

**设计目标**：查看宿舍信息、邀请码，修改昵称。

- **页面元素**：
  - 当前昵称（可编辑）
  - 宿舍名称（如“3-101”）
  - 宿舍邀请码（可复制）
  - 成员列表（显示所有室友）
  - 退出登录按钮（清除 Cookie，跳转登录页）
- **交互**：
  - 修改昵称后调用 API 更新。
  - 点击复制邀请码，用于分享给新室友。

## 5. API 设计（Next.js API Routes）

所有 API 路由位于 `app/api/` 目录下，通过 Route Handlers 实现。认证基于 Cookie 中的用户信息，后端从 Cookie 解析当前用户 ID 及宿舍 ID。

| 方法 | 路径                        | 功能                   | 请求体示例                                                  | 响应体示例                                                   | 权限/隔离            |
| ---- | --------------------------- | ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | -------------------- |
| POST | `/api/login`                | 登录/注册              | `{"name":"张三","inviteCode":"A1B2C"}`                      | `{"userId":1,"dormId":1,"isLeader":true}`                    | 无                   |
| GET  | `/api/status`               | 获取本宿舍所有成员状态 | -                                                           | `[{"userId":1,"name":"张三","state":"睡觉"}]`                | 根据 Cookie 确定宿舍 |
| PUT  | `/api/status`               | 更新当前用户状态       | `{"state":"睡觉"}`                                          | 更新后的状态                                                 | 同上                 |
| GET  | `/api/duty?week=2025-12-11` | 获取指定周值日         | -                                                           | `[{"dutyId":1,"date":"2025-12-11","userId":1,"userName":"张三","completed":false}]` | 自动过滤宿舍         |
| POST | `/api/duty/assign`          | 分配值日（舍长）       | `{"userId":2,"date":"2025-12-11"}`                          | `{"success":true}`                                           | 需验证舍长           |
| POST | `/api/duty/complete`        | 完成值日               | `{"dutyId":1,"imageUrl":"data:..."}`                        | `{"success":true}`                                           | 只能操作自己的       |
| POST | `/api/bills`                | 创建账单               | `{"total":100,"participants":[1,2,3],"description":"电费"}` | `{"billId":456}`                                             | 参与人必须是同宿舍   |
| GET  | `/api/bills`                | 获取本宿舍历史账单     | -                                                           | `[{"id":456,"total":100,"paidCount":1,"totalCount":3}]`      | 自动过滤宿舍         |
| POST | `/api/bills/:id/pay`        | 标记支付               | `{"userId":1}`                                              | `{"success":true}`                                           | 只能标记自己         |
| GET  | `/api/users/me`             | 获取当前用户信息       | -                                                           | `{"id":1,"name":"张三","dormId":1,"isLeader":true,"inviteCode":"A1B2C"}` | -                    |
| PUT  | `/api/users/me`             | 修改昵称               | `{"name":"李四"}`                                           | 更新后的用户信息                                             | -                    |

## 6. 轮询策略

- 客户端使用 React Query 的 `useQuery` 并设置 `refetchInterval`，实现定时刷新。
- 不同页面独立轮询，避免干扰。
- 离开页面时，React Query 自动暂停轮询（组件卸载后清除）。

## 其他

- 增加简单的 session 或 token 机制替代 userId 明文传输（已通过 Cookie 实现）。
- 添加更多趣味性交互（如值日完成动画、状态特效）。
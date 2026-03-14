# 和睦寝室（HarmoniousDorm）

基于 **Next.js 14 App Router** 的宿舍协作系统，包含前后端一体化实现：
- 登录/注册合一（Cookie Session）
- 值日看板（分配/完成）
- 账单管理（创建/支付）
- 状态同步（轮询）
- 个人中心（邀请码与昵称维护）

## 1. 安装依赖

```bash
npm install
```

## 2. 环境变量

复制 `.env.example` 为 `.env`：

```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="harmonious-dorm-dev-secret"
```

## 3. 初始化数据库（Prisma）

```bash
npx prisma generate
npx prisma db push
```

## 4. 启动开发

```bash
npm run dev
```

默认地址：`http://localhost:3000`

### 并行开发（推荐）

如果你本地测试时还需要代理并行修改，请参考文档：

- [并行开发注意事项](./docs/Parallel-Dev.md)

## 5. 后端测试

```bash
npm run test:backend
```

## 6. 生产构建

```bash
npm run build
npm run start
```

## 指定 Node 路径

如果你需要固定使用：`D:\IT_study\Node-js\node.exe`，可直接执行：

```powershell
& 'D:\IT_study\Node-js\node.exe' .\node_modules\next\dist\bin\next dev -p 3000
```

# 农村流水席信息管理系统

毕业设计项目，前后端分离架构。

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + React Router v6
- **后端**: Node.js + Express.js
- **数据库**: SQLite（默认开发用）/ PostgreSQL
- **认证**: JWT

## 目录结构

```
rural-banquet/
├── client/                 # React 前端
├── server/                 # Express.js 后端
```

## 启动步骤

### 1. 准备数据库

默认使用 SQLite，无需安装数据库。首次启动后端时会自动创建 `server/db/data.sqlite`，并初始化表结构、演示数据和默认账号。

如果切换到 PostgreSQL，只需要先创建空数据库：

```bash
psql -U postgres -c "CREATE DATABASE rural_banquet;"
```

然后在 `server/.env` 中设置：

```env
DB_DRIVER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rural_banquet
PGSSL=false
```

PostgreSQL 不需要手动执行建表脚本。后端首次启动时，如果检测到 `users` 表不存在，会自动执行 `server/db/schema.postgres.sql`，并补齐默认账号。

### 2. 启动后端

```bash
cd server
npm install
node app.js
```

后端运行在 `http://localhost:3001`

### 3. 启动前端

```bash
cd client
npm install
npm run dev
```

前端运行在 `http://localhost:5173`

## 默认账号

- 管理员: `admin` / `admin123`
- 工作人员: `staff` / `staff123`

## 功能模块

- 客户管理：CRUD + 历史订单关联
- 宴席订单管理：完整生命周期 + 5 种状态流转
- 档期冲突检测：同日 ≥3 场触发警告
- 菜单管理：菜单模板 + 菜品维护
- 物料 & 人工管理：资源登记
- 变更记录：加桌/改期/换菜/退订全程留痕
- 结算管理：总金额 - 成本 - 已收 = 未收
- 统计分析：按时间/类型汇总营收和场次

## 环境变量

后端 `server/.env`：

```
DB_DRIVER=sqlite
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rural_banquet
PGSSL=false
JWT_SECRET=rural_banquet_secret_2026
PORT=3001
```

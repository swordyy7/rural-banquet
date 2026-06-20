# 农村流水席信息管理系统

毕业设计项目，前后端分离架构。

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + React Router v6
- **后端**: Node.js + Express.js
- **数据库**: PostgreSQL
- **认证**: JWT

## 目录结构

```
rural-banquet/
├── client/                 # React 前端
├── server/                 # Express.js 后端
```

## 启动步骤

### 1. 准备数据库

在 PostgreSQL 中创建数据库并执行建表 SQL：

```bash
psql -U postgres -c "CREATE DATABASE rural_banquet;"
psql -U postgres -d rural_banquet -f server/db/init.sql
```

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

- 用户名: `admin`
- 密码: `admin123`
- 角色: 管理员

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rural_banquet
JWT_SECRET=rural_banquet_secret_2026
PORT=3001
```

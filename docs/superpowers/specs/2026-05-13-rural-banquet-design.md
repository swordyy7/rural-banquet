# 农村流水席信息管理系统 — 设计文档

**日期：** 2026-05-13  
**技术栈：** React 18 + Vite + Tailwind CSS / Express.js / PostgreSQL / JWT  
**语言：** JavaScript（前后端均不使用 TypeScript）

---

## 一、背景与目标

农村流水席（婚宴、寿宴、乔迁宴、满月宴）长期依赖电话、微信和纸笔管理。当业务量增加或多场宴席并行时，容易出现档期冲突、变更遗漏、结算混乱等问题。

系统目标：把原来靠经验记住的规则固化到系统里，实现从客户咨询 → 报价下单 → 档期确认 → 宴席执行 → 费用结算 → 统计分析的全过程管理。

---

## 二、技术架构

```
浏览器（React + Tailwind）
        ↕ HTTP / JSON
Express.js 后端（业务逻辑、JWT 认证、档期检测、结算计算）
        ↕ SQL
PostgreSQL（客户、订单、菜单、变更记录、结算数据）
```

- **前后端分离**：Vite 开发服务器代理到后端 3001 端口
- **认证**：JWT，存于 localStorage，每次请求带 Authorization 头
- **角色**：admin（管理员）/ staff（工作人员），通过中间件区分权限

---

## 三、项目目录结构

```
rural-banquet/
├── client/                        ← React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── OrderDetail.jsx
│   │   │   ├── Menus.jsx
│   │   │   ├── Materials.jsx
│   │   │   └── Statistics.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx          ← 侧边栏 + 顶栏
│   │   │   ├── StatusBadge.jsx     ← 订单状态标签
│   │   │   ├── ScheduleAlert.jsx   ← 档期冲突提示
│   │   │   └── ChangeLog.jsx       ← 变更记录列表
│   │   ├── api/
│   │   │   └── index.js            ← axios 实例 + 各模块接口封装
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     ← 登录状态 + token 管理
│   │   └── utils/
│   │       └── format.js           ← 日期格式化、金额格式化
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                         ← Express.js 后端
│   ├── routes/
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   ├── menus.js
│   │   ├── dishes.js
│   │   ├── materials.js
│   │   ├── labor.js
│   │   ├── changes.js
│   │   ├── settlements.js
│   │   └── statistics.js
│   ├── middleware/
│   │   └── auth.js                 ← JWT 验证中间件
│   ├── db/
│   │   ├── index.js                ← pg Pool 连接
│   │   └── init.sql                ← 建表 SQL
│   ├── app.js
│   └── package.json
│
└── README.md
```

---

## 四、数据库设计

### 4.1 表清单

| 表名 | 说明 |
|---|---|
| `users` | 系统用户（admin / staff） |
| `customers` | 客户基础信息 |
| `banquet_orders` | 宴席订单（核心表） |
| `menus` | 菜单模板 |
| `dishes` | 菜品 |
| `order_menu_details` | 订单-菜品关联明细 |
| `materials` | 物料/餐具/车辆 |
| `labor_arrangements` | 人工安排 |
| `change_records` | 变更记录（加桌、改期、换菜、退订） |
| `settlements` | 结算（总金额、成本、实收、未收） |

### 4.2 核心字段

**banquet_orders**
```sql
id, order_no, customer_id, banquet_type,
event_date, location, table_count, guest_count,
budget, status, notes, created_at, updated_at
```
`status` 枚举：`pending`（待确认）/ `confirmed`（已确认）/ `in_progress`（执行中）/ `completed`（已完成）/ `cancelled`（已取消）

**change_records**
```sql
id, order_id, change_type, before_value,
after_value, reason, created_by, created_at
```
`change_type` 枚举：`table_count`（加/减桌）/ `reschedule`（改期）/ `menu_change`（换菜）/ `cancellation`（退订）

**settlements**
```sql
id, order_id, total_amount, actual_cost,
received_amount, payment_method, notes, settled_at
```
`未收金额` = `total_amount - received_amount`（前端计算展示）

### 4.3 关键约束

- `banquet_orders.customer_id` → `customers.id`（外键）
- `change_records.order_id` → `banquet_orders.id`（外键）
- `settlements.order_id` → `banquet_orders.id`（唯一外键，一单一结算）
- `order_menu_details` 中删除订单时级联删除明细

---

## 五、API 路由设计

所有路由均需 JWT 认证（`/api/auth/login` 除外）。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/customers` | 客户列表（支持姓名/电话查询） |
| POST | `/api/customers` | 新建客户 |
| GET | `/api/customers/:id` | 客户详情 + 历史订单 |
| PUT | `/api/customers/:id` | 更新客户 |
| DELETE | `/api/customers/:id` | 删除客户（仅 admin） |
| GET | `/api/orders` | 订单列表（支持状态/日期筛选） |
| POST | `/api/orders` | 新建订单（内部调用档期检测） |
| GET | `/api/orders/:id` | 订单详情 |
| PUT | `/api/orders/:id` | 更新订单 |
| GET | `/api/orders/schedule-check` | 档期冲突检测（?date=&orderId=） |
| GET | `/api/orders/:id/changes` | 变更记录列表 |
| POST | `/api/orders/:id/changes` | 新增变更记录 |
| GET | `/api/menus` | 菜单列表 |
| POST | `/api/menus` | 新建菜单 |
| PUT | `/api/menus/:id` | 更新菜单 |
| DELETE | `/api/menus/:id` | 删除菜单 |
| GET | `/api/dishes` | 菜品列表 |
| POST | `/api/dishes` | 新建菜品 |
| PUT | `/api/dishes/:id` | 更新菜品 |
| GET | `/api/materials` | 物料列表 |
| POST | `/api/materials` | 新建物料 |
| GET | `/api/orders/:id/labor` | 人工安排 |
| POST | `/api/orders/:id/labor` | 新增人工安排 |
| GET | `/api/orders/:id/settlement` | 结算详情 |
| POST | `/api/orders/:id/settlement` | 创建/更新结算 |
| GET | `/api/statistics` | 统计数据（?from=&to=&type=） |

---

## 六、档期冲突检测逻辑

后端在 `POST /api/orders` 时执行以下检测：

```
1. 查询 banquet_orders 中 event_date = 新订单日期 且 status NOT IN ('cancelled')
2. 若结果数量 >= 3（可配置阈值），返回 warning 级别提示
3. 若结果数量 >= 1，返回 info 级别提示（当天已有 N 场，请注意资源）
4. 前端展示 ScheduleAlert 组件，用户确认后可强制保存
```

---

## 七、前端页面说明

| 页面 | 核心功能 |
|---|---|
| Login | 账号密码登录，JWT 存 localStorage |
| Dashboard | 今日订单列表、本月接单数、本月营收概览 |
| Customers | 客户列表（搜索/新增/编辑）、客户详情含历史订单 |
| Orders | 订单列表（状态筛选、日期范围筛选）、快速新建 |
| OrderDetail | 完整订单信息、菜单关联、人工安排、变更记录、结算操作 |
| Menus | 菜单模板管理、菜品管理 |
| Materials | 物料登记与查询 |
| Statistics | 按时间/类型汇总：接单数、营收、成本、毛利 |

---

## 八、权限控制

| 操作 | admin | staff |
|---|---|---|
| 查看所有数据 | ✓ | ✓ |
| 新建/编辑订单 | ✓ | ✓ |
| 删除客户/订单 | ✓ | ✗ |
| 查看统计分析 | ✓ | ✓ |
| 管理用户账号 | ✓ | ✗ |

---

## 九、非功能需求实现方式

- **易用性**：表单字段名贴合业务（"宴席类型"而非"type"），状态用中文标签展示
- **可靠性**：后端校验必填字段，档期检测在服务端执行，不依赖前端
- **安全性**：JWT 过期时间 24h，密码 bcrypt 加密，admin 操作有角色中间件保护
- **可维护性**：路由按模块拆分，数据库操作集中在 routes 文件中，便于扩展

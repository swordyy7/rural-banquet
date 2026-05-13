# 农村流水席 — 后端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Express.js + PostgreSQL 后端，包含 JWT 认证、全部 REST API 路由和档期冲突检测。

**Architecture:** Monorepo 中的 `server/` 目录，Express 路由按模块拆分，原生 `pg` 库操作 PostgreSQL，bcryptjs 加密密码，jsonwebtoken 处理认证。

**Tech Stack:** Node.js, Express.js, PostgreSQL, pg, bcryptjs, jsonwebtoken, cors, dotenv

**Working directory for all commands:** `C:\Users\swordy\lunwen\server`

---

## 文件结构

```
server/
├── app.js                  ← Express 入口，注册所有路由
├── package.json
├── .env                    ← DB 连接串 + JWT_SECRET
├── db/
│   ├── index.js            ← pg Pool
│   └── init.sql            ← 建表 + 初始数据
├── middleware/
│   └── auth.js             ← JWT 验证 + 角色检查
└── routes/
    ├── auth.js
    ├── customers.js
    ├── orders.js
    ├── changes.js
    ├── menus.js
    ├── dishes.js
    ├── materials.js
    ├── labor.js
    ├── settlements.js
    └── statistics.js
```

---

## Task 1: 初始化项目结构

**Files:**
- Create: `server/package.json`
- Create: `server/.env`
- Create: `server/app.js`

- [ ] **Step 1: 在项目根目录创建 server 文件夹并初始化**

```bash
cd C:\Users\swordy\lunwen
mkdir server
cd server
npm init -y
npm install express pg bcryptjs jsonwebtoken cors dotenv
mkdir db middleware routes
```

- [ ] **Step 2: 创建 `server/.env`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rural_banquet
JWT_SECRET=rural_banquet_secret_2026
PORT=3001
```

- [ ] **Step 3: 创建 `server/app.js`**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/menus',       require('./routes/menus'));
app.use('/api/dishes',      require('./routes/dishes'));
app.use('/api/materials',   require('./routes/materials'));
app.use('/api/statistics',  require('./routes/statistics'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

- [ ] **Step 4: 验证能启动（暂时会报错，因路由文件还未创建——这是预期的）**

```bash
node app.js
```
预期输出：`Error: Cannot find module './routes/auth'`（说明入口正常）

---

## Task 2: 数据库建表

**Files:**
- Create: `server/db/index.js`
- Create: `server/db/init.sql`

- [ ] **Step 1: 在 PostgreSQL 中创建数据库**

用 psql 或 pgAdmin 执行：
```sql
CREATE DATABASE rural_banquet;
```

- [ ] **Step 2: 创建 `server/db/index.js`**

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

- [ ] **Step 3: 创建 `server/db/init.sql`**

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(50) UNIQUE NOT NULL,
  password   VARCHAR(100) NOT NULL,
  role       VARCHAR(10) NOT NULL DEFAULT 'staff',  -- admin / staff
  phone      VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  address    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 宴席订单表
CREATE TABLE IF NOT EXISTS banquet_orders (
  id           SERIAL PRIMARY KEY,
  order_no     VARCHAR(20) UNIQUE NOT NULL,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  banquet_type VARCHAR(20) NOT NULL,  -- 婚宴/寿宴/乔迁宴/满月宴
  event_date   DATE NOT NULL,
  location     TEXT,
  table_count  INTEGER NOT NULL DEFAULT 1,
  guest_count  INTEGER,
  budget       NUMERIC(10,2),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 菜单模板表
CREATE TABLE IF NOT EXISTS menus (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  scene       VARCHAR(20),   -- 婚宴/寿宴/通用
  price       NUMERIC(10,2),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(30),
  unit_price  NUMERIC(8,2),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 订单菜单明细表
CREATE TABLE IF NOT EXISTS order_menu_details (
  id        SERIAL PRIMARY KEY,
  order_id  INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  menu_id   INTEGER REFERENCES menus(id) ON DELETE SET NULL,
  dish_id   INTEGER REFERENCES dishes(id) ON DELETE SET NULL,
  quantity  INTEGER DEFAULT 1,
  notes     TEXT
);

-- 物料表
CREATE TABLE IF NOT EXISTS materials (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(30),   -- 食材/餐具/设备
  unit        VARCHAR(20),
  unit_price  NUMERIC(8,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 人工安排表
CREATE TABLE IF NOT EXISTS labor_arrangements (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  role       VARCHAR(30) NOT NULL,  -- 厨师/帮厨/服务员/司机
  name       VARCHAR(50),
  phone      VARCHAR(20),
  fee        NUMERIC(8,2),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 变更记录表
CREATE TABLE IF NOT EXISTS change_records (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  change_type  VARCHAR(30) NOT NULL,  -- table_count/reschedule/menu_change/cancellation
  before_value TEXT,
  after_value  TEXT,
  reason       TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER UNIQUE NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method   VARCHAR(20),  -- 现金/微信/转账
  notes            TEXT,
  settled_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 初始管理员账号 (密码: admin123，已用 bcrypt hash)
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: 执行建表 SQL**

```bash
psql -U postgres -d rural_banquet -f db/init.sql
```
预期：每张表显示 `CREATE TABLE`，最后一行 `INSERT 0 1`

---

## Task 3: JWT 认证中间件

**Files:**
- Create: `server/middleware/auth.js`

- [ ] **Step 1: 创建 `server/middleware/auth.js`**

```js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
```

---

## Task 4: 认证路由

**Files:**
- Create: `server/routes/auth.js`

- [ ] **Step 1: 创建 `server/routes/auth.js`**

```js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE username = $1', [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: 测试登录接口**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```
预期：返回含 `token` 字段的 JSON

---

## Task 5: 客户路由

**Files:**
- Create: `server/routes/customers.js`

- [ ] **Step 1: 创建 `server/routes/customers.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/customers?search=
router.get('/', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM customers';
    let params = [];
    if (search) {
      query += ' WHERE name ILIKE $1 OR phone ILIKE $1';
      params = [`%${search}%`];
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id  (含历史订单)
router.get('/:id', async (req, res) => {
  try {
    const { rows: cRows } = await db.query(
      'SELECT * FROM customers WHERE id = $1', [req.params.id]
    );
    if (!cRows[0]) return res.status(404).json({ error: '客户不存在' });
    const { rows: oRows } = await db.query(
      'SELECT id, order_no, banquet_type, event_date, table_count, status FROM banquet_orders WHERE customer_id = $1 ORDER BY event_date DESC',
      [req.params.id]
    );
    res.json({ ...cRows[0], orders: oRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和电话必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO customers (name, phone, address, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone, address || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和电话必填' });
  try {
    const { rows } = await db.query(
      'UPDATE customers SET name=$1, phone=$2, address=$3, notes=$4 WHERE id=$5 RETURNING *',
      [name, phone, address || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '客户不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id  (仅 admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## Task 6: 订单路由（含档期检测）

**Files:**
- Create: `server/routes/orders.js`

- [ ] **Step 1: 创建 `server/routes/orders.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// 档期冲突检测辅助函数
async function checkSchedule(date, excludeOrderId = null) {
  let query = `SELECT COUNT(*) FROM banquet_orders WHERE event_date = $1 AND status != 'cancelled'`;
  let params = [date];
  if (excludeOrderId) {
    query += ` AND id != $2`;
    params.push(excludeOrderId);
  }
  const { rows } = await db.query(query, params);
  return parseInt(rows[0].count);
}

// GET /api/orders/schedule-check?date=2026-06-01&orderId=5
router.get('/schedule-check', async (req, res) => {
  const { date, orderId } = req.query;
  if (!date) return res.status(400).json({ error: '日期必填' });
  try {
    const count = await checkSchedule(date, orderId);
    let level = 'ok';
    let message = null;
    if (count >= 3) {
      level = 'warning';
      message = `当天已有 ${count} 场宴席，资源可能紧张，是否确认继续接单？`;
    } else if (count >= 1) {
      level = 'info';
      message = `当天已有 ${count} 场宴席，请注意资源安排`;
    }
    res.json({ level, count, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders?status=&from=&to=
router.get('/', async (req, res) => {
  const { status, from, to } = req.query;
  let query = `
    SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
    FROM banquet_orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { params.push(status); query += ` AND o.status = $${params.length}`; }
  if (from)   { params.push(from);   query += ` AND o.event_date >= $${params.length}`; }
  if (to)     { params.push(to);     query += ` AND o.event_date <= $${params.length}`; }
  query += ' ORDER BY o.event_date DESC';
  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
      FROM banquet_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });

    // 同时查菜单明细、人工、变更、结算
    const [details, labor, changes, settlement] = await Promise.all([
      db.query(`
        SELECT omd.*, m.name AS menu_name, d.name AS dish_name
        FROM order_menu_details omd
        LEFT JOIN menus m ON omd.menu_id = m.id
        LEFT JOIN dishes d ON omd.dish_id = d.id
        WHERE omd.order_id = $1
      `, [req.params.id]),
      db.query('SELECT * FROM labor_arrangements WHERE order_id = $1', [req.params.id]),
      db.query('SELECT * FROM change_records WHERE order_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM settlements WHERE order_id = $1', [req.params.id]),
    ]);

    res.json({
      ...rows[0],
      menu_details: details.rows,
      labor: labor.rows,
      changes: changes.rows,
      settlement: settlement.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 生成订单编号
async function genOrderNo() {
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM banquet_orders WHERE order_no LIKE $1`, [`BQ${today}%`]
  );
  const seq = String(parseInt(rows[0].count) + 1).padStart(3, '0');
  return `BQ${today}${seq}`;
}

// POST /api/orders
router.post('/', async (req, res) => {
  const { customer_id, banquet_type, event_date, location, table_count, guest_count, budget, notes } = req.body;
  if (!banquet_type || !event_date || !table_count) {
    return res.status(400).json({ error: '宴席类型、日期和桌数必填' });
  }
  try {
    const order_no = await genOrderNo();
    const { rows } = await db.query(`
      INSERT INTO banquet_orders
        (order_no, customer_id, banquet_type, event_date, location, table_count, guest_count, budget, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [order_no, customer_id||null, banquet_type, event_date, location||null, table_count, guest_count||null, budget||null, notes||null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  const { banquet_type, event_date, location, table_count, guest_count, budget, status, notes, customer_id } = req.body;
  try {
    const { rows } = await db.query(`
      UPDATE banquet_orders SET
        customer_id=$1, banquet_type=$2, event_date=$3, location=$4,
        table_count=$5, guest_count=$6, budget=$7, status=$8, notes=$9,
        updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [customer_id||null, banquet_type, event_date, location||null, table_count, guest_count||null, budget||null, status, notes||null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id (仅 admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM banquet_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/menu-details
router.post('/:id/menu-details', async (req, res) => {
  const { menu_id, dish_id, quantity, notes } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO order_menu_details (order_id,menu_id,dish_id,quantity,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, menu_id||null, dish_id||null, quantity||1, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id/menu-details/:detailId
router.delete('/:id/menu-details/:detailId', async (req, res) => {
  try {
    await db.query('DELETE FROM order_menu_details WHERE id=$1 AND order_id=$2', [req.params.detailId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## Task 7: 变更记录、人工安排路由

**Files:**
- Create: `server/routes/changes.js`
- Create: `server/routes/labor.js`

- [ ] **Step 1: 创建 `server/routes/changes.js`**

```js
const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM change_records WHERE order_id=$1 ORDER BY created_at DESC',
    [req.params.orderId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { change_type, before_value, after_value, reason } = req.body;
  if (!change_type) return res.status(400).json({ error: '变更类型必填' });
  const { rows } = await db.query(
    'INSERT INTO change_records (order_id,change_type,before_value,after_value,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.orderId, change_type, before_value||null, after_value||null, reason||null, req.user.id]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
```

- [ ] **Step 2: 创建 `server/routes/labor.js`**

```js
const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM labor_arrangements WHERE order_id=$1', [req.params.orderId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { role, name, phone, fee, notes } = req.body;
  if (!role) return res.status(400).json({ error: '角色必填' });
  const { rows } = await db.query(
    'INSERT INTO labor_arrangements (order_id,role,name,phone,fee,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.orderId, role, name||null, phone||null, fee||null, notes||null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:laborId', async (req, res) => {
  await db.query('DELETE FROM labor_arrangements WHERE id=$1 AND order_id=$2', [req.params.laborId, req.params.orderId]);
  res.json({ success: true });
});

module.exports = router;
```

- [ ] **Step 3: 在 `server/app.js` 挂载子路由（嵌套路由）**

在 `app.js` 的路由注册部分，补充以下两行（放在 orders 路由之后）：

```js
app.use('/api/orders/:orderId/changes', require('./routes/changes'));
app.use('/api/orders/:orderId/labor',   require('./routes/labor'));
```

---

## Task 8: 菜单、菜品、物料路由

**Files:**
- Create: `server/routes/menus.js`
- Create: `server/routes/dishes.js`
- Create: `server/routes/materials.js`

- [ ] **Step 1: 创建 `server/routes/menus.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM menus ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, scene, price, description } = req.body;
  if (!name) return res.status(400).json({ error: '菜单名称必填' });
  const { rows } = await db.query(
    'INSERT INTO menus (name,scene,price,description) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, scene||null, price||null, description||null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, scene, price, description } = req.body;
  const { rows } = await db.query(
    'UPDATE menus SET name=$1,scene=$2,price=$3,description=$4 WHERE id=$5 RETURNING *',
    [name, scene||null, price||null, description||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: '菜单不存在' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM menus WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
```

- [ ] **Step 2: 创建 `server/routes/dishes.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM dishes ORDER BY category, name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, category, unit_price, description } = req.body;
  if (!name) return res.status(400).json({ error: '菜品名称必填' });
  const { rows } = await db.query(
    'INSERT INTO dishes (name,category,unit_price,description) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, category||null, unit_price||null, description||null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, category, unit_price, description } = req.body;
  const { rows } = await db.query(
    'UPDATE dishes SET name=$1,category=$2,unit_price=$3,description=$4 WHERE id=$5 RETURNING *',
    [name, category||null, unit_price||null, description||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: '菜品不存在' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM dishes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
```

- [ ] **Step 3: 创建 `server/routes/materials.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM materials ORDER BY category, name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, category, unit, unit_price, notes } = req.body;
  if (!name) return res.status(400).json({ error: '物料名称必填' });
  const { rows } = await db.query(
    'INSERT INTO materials (name,category,unit,unit_price,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, category||null, unit||null, unit_price||null, notes||null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, category, unit, unit_price, notes } = req.body;
  const { rows } = await db.query(
    'UPDATE materials SET name=$1,category=$2,unit=$3,unit_price=$4,notes=$5 WHERE id=$6 RETURNING *',
    [name, category||null, unit||null, unit_price||null, notes||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: '物料不存在' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM materials WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
```

---

## Task 9: 结算路由

**Files:**
- Create: `server/routes/settlements.js`

- [ ] **Step 1: 创建 `server/routes/settlements.js`**

```js
const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM settlements WHERE order_id=$1', [req.params.orderId]
  );
  res.json(rows[0] || null);
});

router.post('/', async (req, res) => {
  const { total_amount, actual_cost, received_amount, payment_method, notes } = req.body;
  try {
    const { rows } = await db.query(`
      INSERT INTO settlements (order_id,total_amount,actual_cost,received_amount,payment_method,notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (order_id) DO UPDATE SET
        total_amount=$2, actual_cost=$3, received_amount=$4,
        payment_method=$5, notes=$6, settled_at=NOW()
      RETURNING *
    `, [req.params.orderId, total_amount||0, actual_cost||0, received_amount||0, payment_method||null, notes||null]);

    // 自动把订单状态改为 completed
    await db.query(
      `UPDATE banquet_orders SET status='completed', updated_at=NOW() WHERE id=$1`,
      [req.params.orderId]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: 在 `app.js` 挂载结算路由**

```js
app.use('/api/orders/:orderId/settlement', require('./routes/settlements'));
```

---

## Task 10: 统计路由

**Files:**
- Create: `server/routes/statistics.js`

- [ ] **Step 1: 创建 `server/routes/statistics.js`**

```js
const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/statistics?from=2026-01-01&to=2026-12-31
router.get('/', async (req, res) => {
  const { from = '2000-01-01', to = '2099-12-31' } = req.query;
  try {
    const [overview, byType, recent] = await Promise.all([
      // 总览
      db.query(`
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status='completed') AS completed_orders,
          COUNT(*) FILTER (WHERE status='cancelled') AS cancelled_orders,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue,
          COALESCE(SUM(s.actual_cost), 0) AS total_cost,
          COALESCE(SUM(s.received_amount), 0) AS total_received
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE o.event_date BETWEEN $1 AND $2
      `, [from, to]),

      // 按宴席类型分组
      db.query(`
        SELECT
          o.banquet_type,
          COUNT(*) AS count,
          COALESCE(SUM(s.total_amount), 0) AS revenue
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE o.event_date BETWEEN $1 AND $2
        GROUP BY o.banquet_type
        ORDER BY count DESC
      `, [from, to]),

      // 最近 5 个月月度趋势
      db.query(`
        SELECT
          TO_CHAR(event_date, 'YYYY-MM') AS month,
          COUNT(*) AS count,
          COALESCE(SUM(s.total_amount), 0) AS revenue
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE event_date >= NOW() - INTERVAL '5 months'
        GROUP BY month ORDER BY month
      `),
    ]);

    res.json({
      overview: overview.rows[0],
      by_type: byType.rows,
      monthly: recent.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## Task 11: 最终验证后端

- [ ] **Step 1: 启动后端服务**

```bash
cd C:\Users\swordy\lunwen\server
node app.js
```
预期：`Server running on port 3001`

- [ ] **Step 2: 验证登录接口**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```
预期：返回 `{ "token": "eyJ...", "user": { ... } }`

- [ ] **Step 3: 用 token 测试客户接口**

```bash
# 将上一步的 token 填入 <TOKEN>
curl http://localhost:3001/api/customers \
  -H "Authorization: Bearer <TOKEN>"
```
预期：返回 `[]`（空数组）

- [ ] **Step 4: 提交后端代码**

```bash
cd C:\Users\swordy\lunwen
git init
git add server/
git commit -m "feat: 完成后端所有路由和数据库建表"
```

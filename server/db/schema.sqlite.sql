-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'staff',
  phone      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  address    TEXT,
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 宴席订单表
CREATE TABLE IF NOT EXISTS banquet_orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no     TEXT UNIQUE NOT NULL,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  banquet_type TEXT NOT NULL,
  event_date   TEXT NOT NULL,
  location     TEXT,
  table_count  INTEGER NOT NULL DEFAULT 1,
  guest_count  INTEGER,
  budget       REAL,
  status       TEXT NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- 菜单模板表
CREATE TABLE IF NOT EXISTS menus (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  scene       TEXT,
  price       REAL,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT,
  unit_price  REAL,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 订单菜单明细表
CREATE TABLE IF NOT EXISTS order_menu_details (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  menu_id   INTEGER REFERENCES menus(id) ON DELETE SET NULL,
  dish_id   INTEGER REFERENCES dishes(id) ON DELETE SET NULL,
  quantity  INTEGER DEFAULT 1,
  notes     TEXT
);

-- 物料表
CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT,
  unit        TEXT,
  unit_price  REAL,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 人工安排表
CREATE TABLE IF NOT EXISTS labor_arrangements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  name       TEXT,
  phone      TEXT,
  fee        REAL,
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 变更记录表
CREATE TABLE IF NOT EXISTS change_records (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  change_type  TEXT NOT NULL,
  before_value TEXT,
  after_value  TEXT,
  reason       TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT (datetime('now'))
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER UNIQUE NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  total_amount     REAL NOT NULL DEFAULT 0,
  actual_cost      REAL NOT NULL DEFAULT 0,
  received_amount  REAL NOT NULL DEFAULT 0,
  payment_method   TEXT,
  notes            TEXT,
  settled_at       TEXT DEFAULT (datetime('now'))
);

-- 管理员账号会在驱动启动时通过 bcrypt 程序化插入

-- 一些演示数据
INSERT OR IGNORE INTO customers (name, phone, address, notes) VALUES
  ('张大山', '13888888001', '李家村3组', '熟客，多次合作'),
  ('王秀英', '13888888002', '王家村东头', '');

INSERT OR IGNORE INTO dishes (name, category, unit_price, description) VALUES
  ('红烧肉', '荤菜', 38.00, '经典红烧肉'),
  ('白切鸡', '荤菜', 45.00, '土鸡现切'),
  ('糖醋鲤鱼', '荤菜', 58.00, '酸甜可口'),
  ('凉拌黄瓜', '凉菜', 12.00, ''),
  ('蒸鸡蛋', '蛋类', 15.00, '');

INSERT OR IGNORE INTO menus (name, scene, price, description) VALUES
  ('婚宴标准套餐', '婚宴', 888.00, '14 道菜，10 桌起订'),
  ('寿宴喜庆套餐', '寿宴', 666.00, '12 道菜，含寿桃');

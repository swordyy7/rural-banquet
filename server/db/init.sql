-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(50) UNIQUE NOT NULL,
  password   VARCHAR(100) NOT NULL,
  role       VARCHAR(10) NOT NULL DEFAULT 'staff',
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
  banquet_type VARCHAR(20) NOT NULL,
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
  scene       VARCHAR(20),
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
  category    VARCHAR(30),
  unit        VARCHAR(20),
  unit_price  NUMERIC(8,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 人工安排表
CREATE TABLE IF NOT EXISTS labor_arrangements (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  role       VARCHAR(30) NOT NULL,
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
  change_type  VARCHAR(30) NOT NULL,
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
  payment_method   VARCHAR(20),
  notes            TEXT,
  settled_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 初始管理员账号 (密码: admin123)
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT DO NOTHING;

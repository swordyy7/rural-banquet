-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'staff',
  phone      TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 村字典表（地点按村，用于客户/订单选址与价格带匹配）
CREATE TABLE IF NOT EXISTS villages (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  village_id INTEGER REFERENCES villages(id) ON DELETE SET NULL,
  address    TEXT,                    -- 详细地址（选填，门牌/组号等）
  notes      TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 宴席订单表
CREATE TABLE IF NOT EXISTS banquet_orders (
  id           SERIAL PRIMARY KEY,
  order_no     TEXT UNIQUE NOT NULL,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  banquet_type TEXT NOT NULL,
  event_date   TEXT NOT NULL,
  village_id   INTEGER REFERENCES villages(id) ON DELETE SET NULL,
  location     TEXT,
  table_count  INTEGER NOT NULL DEFAULT 1,
  guest_count  INTEGER,
  budget       NUMERIC(10,2),
  service_fee  NUMERIC(10,2),           -- 服务费（按价格带匹配带入，可手改）
  status       TEXT NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at   TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 价格带表（按 村 / 日期区间 / 桌数范围 设置整单服务费）
CREATE TABLE IF NOT EXISTS price_bands (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  village_id  INTEGER REFERENCES villages(id) ON DELETE SET NULL,  -- 空 = 不限村
  start_date  TEXT,                          -- 空 = 不限起始
  end_date    TEXT,                          -- 空 = 不限结束
  min_tables  INTEGER,                       -- 空 = 不限下限；区间为 [min, max)
  max_tables  INTEGER,                       -- 空 = 不限上限
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,  -- 整单服务费（一口价）
  priority    INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 菜单模板表
CREATE TABLE IF NOT EXISTS menus (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  scene       TEXT,
  price       NUMERIC(10,2),
  description TEXT,
  created_at  TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  unit_price  NUMERIC(10,2),
  description TEXT,
  created_at  TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 菜单模板菜品明细表
CREATE TABLE IF NOT EXISTS menu_dishes (
  id         SERIAL PRIMARY KEY,
  menu_id    INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  dish_id    INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  notes      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(menu_id, dish_id)
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
  name        TEXT NOT NULL,
  category    TEXT,
  unit        TEXT,
  unit_price  NUMERIC(10,2),
  stock       NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 当前库存数量
  notes       TEXT,
  created_at  TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 订单准备物料表（准备阶段：每单需要准备的物料及数量）
CREATE TABLE IF NOT EXISTS order_materials (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  planned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 需要准备的数量（下单时从库存扣减）
  actual_qty  NUMERIC(12,2),                       -- 宴席后管理员的清点结果
  unit_price  NUMERIC(10,2),                       -- 准备时的物料单价快照
  created_at  TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 物料损耗表（结算清点后写入：准备数 - 清点结果 = 损耗）
CREATE TABLE IF NOT EXISTS material_losses (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  material_id   INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  material_name TEXT,
  planned_qty   NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_qty    NUMERIC(12,2) NOT NULL DEFAULT 0,
  loss_qty      NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price    NUMERIC(10,2),
  loss_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  UNIQUE(order_id, material_id)
);

-- 人工安排表
CREATE TABLE IF NOT EXISTS labor_arrangements (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  name       TEXT,
  phone      TEXT,
  fee        NUMERIC(10,2),
  notes      TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 变更记录表
CREATE TABLE IF NOT EXISTS change_records (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  change_type  TEXT NOT NULL,
  before_value TEXT,
  after_value  TEXT,
  reason       TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER UNIQUE NOT NULL REFERENCES banquet_orders(id) ON DELETE CASCADE,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,   -- 营收口径 = 实际收款（派生）
  actual_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,   -- 成本口径（总损耗）= 额外损耗 + 物料损耗费（派生）
  received_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,   -- 实际收款金额
  extra_loss       NUMERIC(10,2) NOT NULL DEFAULT 0,   -- 额外损耗（可选，人工估损等）
  payment_method   TEXT,
  notes            TEXT,
  settled_at       TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 索引：面向高频查询模式（主键、UNIQUE 约束已自动建索引，此处补充业务查询索引）
CREATE INDEX IF NOT EXISTS idx_orders_event_date     ON banquet_orders(event_date);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON banquet_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer       ON banquet_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_village        ON banquet_orders(village_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_village     ON customers(village_id);
CREATE INDEX IF NOT EXISTS idx_order_menu_order      ON order_menu_details(order_id);
CREATE INDEX IF NOT EXISTS idx_labor_order           ON labor_arrangements(order_id);
CREATE INDEX IF NOT EXISTS idx_changes_order         ON change_records(order_id);
CREATE INDEX IF NOT EXISTS idx_order_materials_order ON order_materials(order_id);
-- 说明：menu_dishes(menu_id,dish_id)、material_losses(order_id,material_id)、settlements(order_id)
--      已由 UNIQUE 约束自动建立（复合）索引，按 order_id/menu_id 前缀查询即可命中，无需重复创建。

-- 管理员账号会在驱动启动时通过 bcrypt 程序化插入

-- 一些演示数据
INSERT INTO villages (name) VALUES ('李家村'), ('王家村'), ('赵庄')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, village_id, address, notes) VALUES
  ('张大山', '13888888001', (SELECT id FROM villages WHERE name='李家村'), '3组', '熟客，多次合作'),
  ('王秀英', '13888888002', (SELECT id FROM villages WHERE name='王家村'), '东头', '')
ON CONFLICT DO NOTHING;

INSERT INTO dishes (name, category, unit_price, description) VALUES
  ('红烧肉', '荤菜', 38.00, '经典红烧肉'),
  ('白切鸡', '荤菜', 45.00, '土鸡现切'),
  ('糖醋鲤鱼', '荤菜', 58.00, '酸甜可口'),
  ('凉拌黄瓜', '凉菜', 12.00, ''),
  ('蒸鸡蛋', '蛋类', 15.00, '')
ON CONFLICT DO NOTHING;

INSERT INTO menus (name, scene, price, description) VALUES
  ('婚宴标准套餐', '婚宴', 888.00, '14 道菜，10 桌起订'),
  ('寿宴喜庆套餐', '寿宴', 666.00, '12 道菜，含寿桃')
ON CONFLICT DO NOTHING;

INSERT INTO menu_dishes (menu_id, dish_id, quantity, sort_order)
SELECT m.id, d.id, 1,
  CASE d.name
    WHEN '红烧肉' THEN 1
    WHEN '白切鸡' THEN 2
    WHEN '糖醋鲤鱼' THEN 3
    WHEN '凉拌黄瓜' THEN 4
    WHEN '蒸鸡蛋' THEN 5
    ELSE 99
  END
FROM menus m
JOIN dishes d ON (
  (m.name = '婚宴标准套餐' AND d.name IN ('红烧肉', '白切鸡', '糖醋鲤鱼', '凉拌黄瓜'))
  OR
  (m.name = '寿宴喜庆套餐' AND d.name IN ('白切鸡', '蒸鸡蛋', '红烧肉'))
)
ON CONFLICT DO NOTHING;

INSERT INTO materials (name, category, unit, unit_price, stock, notes) VALUES
  ('圆桌',     '桌椅', '张', 80.00,  60,  '可坐10人'),
  ('塑料椅',   '桌椅', '把', 15.00,  600, ''),
  ('碗筷套装', '餐具', '套', 5.00,   500, ''),
  ('遮阳棚',   '设备', '顶', 300.00, 8,   ''),
  ('燃气灶',   '设备', '台', 200.00, 10,  '')
ON CONFLICT DO NOTHING;

-- 演示价格带：王家村大宴旺季加价、李家村普通价、兜底价
INSERT INTO price_bands (name, village_id, start_date, end_date, min_tables, max_tables, service_fee, priority, enabled)
SELECT '王家村·旺季·大宴', v.id, '2026-01-01', '2026-03-31', 10, NULL, 2000, 20, 1 FROM villages v WHERE v.name='王家村'
ON CONFLICT DO NOTHING;
INSERT INTO price_bands (name, village_id, start_date, end_date, min_tables, max_tables, service_fee, priority, enabled)
SELECT '李家村·常规', v.id, NULL, NULL, 0, 10, 800, 10, 1 FROM villages v WHERE v.name='李家村'
ON CONFLICT DO NOTHING;
INSERT INTO price_bands (name, village_id, start_date, end_date, min_tables, max_tables, service_fee, priority, enabled)
VALUES ('默认兜底价', NULL, NULL, NULL, NULL, NULL, 500, 0, 1)
ON CONFLICT DO NOTHING;

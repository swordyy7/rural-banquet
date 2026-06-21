const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows: menus } = await db.query('SELECT * FROM menus ORDER BY created_at DESC');
    const { rows: items } = await db.query(`
      SELECT
        md.menu_id,
        md.dish_id,
        md.quantity,
        md.notes,
        md.sort_order,
        d.name AS dish_name,
        d.category,
        d.unit_price,
        d.description AS dish_description
      FROM menu_dishes md
      JOIN dishes d ON md.dish_id = d.id
      ORDER BY md.menu_id, md.sort_order, md.id
    `);
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.menu_id]) acc[item.menu_id] = [];
      acc[item.menu_id].push(item);
      return acc;
    }, {});
    res.json(menus.map(menu => ({ ...menu, dishes: grouped[menu.id] || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, scene, price, description, dishes = [] } = req.body;
  if (!name) return res.status(400).json({ error: '菜单名称必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO menus (name,scene,price,description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, scene || null, price || null, description || null]
    );
    await saveMenuDishes(rows[0].id, dishes);
    res.status(201).json(await getMenu(rows[0].id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, scene, price, description, dishes = [] } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE menus SET name=$1,scene=$2,price=$3,description=$4 WHERE id=$5 RETURNING *',
      [name, scene || null, price || null, description || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '菜单不存在' });
    await saveMenuDishes(req.params.id, dishes);
    res.json(await getMenu(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menus WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getMenu(id) {
  const { rows } = await db.query('SELECT * FROM menus WHERE id=$1', [id]);
  const menu = rows[0];
  if (!menu) return null;
  const { rows: dishes } = await db.query(`
    SELECT
      md.menu_id,
      md.dish_id,
      md.quantity,
      md.notes,
      md.sort_order,
      d.name AS dish_name,
      d.category,
      d.unit_price,
      d.description AS dish_description
    FROM menu_dishes md
    JOIN dishes d ON md.dish_id = d.id
    WHERE md.menu_id = $1
    ORDER BY md.sort_order, md.id
  `, [id]);
  return { ...menu, dishes };
}

async function saveMenuDishes(menuId, dishes) {
  await db.query('DELETE FROM menu_dishes WHERE menu_id=$1', [menuId]);
  for (const [index, item] of dishes.entries()) {
    if (!item.dish_id) continue;
    await db.query(`
      INSERT INTO menu_dishes (menu_id,dish_id,quantity,notes,sort_order)
      VALUES ($1,$2,$3,$4,$5)
    `, [
      menuId,
      item.dish_id,
      Number(item.quantity) || 1,
      item.notes || null,
      index + 1,
    ]);
  }
}

module.exports = router;

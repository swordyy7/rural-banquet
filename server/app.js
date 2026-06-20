require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/orders',      require('./routes/changes'));
app.use('/api/orders',      require('./routes/labor'));
app.use('/api/orders',      require('./routes/settlements'));
app.use('/api/menus',       require('./routes/menus'));
app.use('/api/dishes',      require('./routes/dishes'));
app.use('/api/materials',   require('./routes/materials'));
app.use('/api/statistics',  require('./routes/statistics'));

const db = require('./db');
const PORT = process.env.PORT || 3001;

// 等数据库初始化（建表 / 演示数据）完成后再启动服务
db.ready
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => {
    console.error('数据库连接/初始化失败:', err.message);
    process.exit(1);
  });

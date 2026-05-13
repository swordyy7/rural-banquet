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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

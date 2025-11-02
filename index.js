const express = require('express');
const app = express(); 
const pool = require('./db');
const cors = require('cors');
const swaggerDocs = require('./swagger');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

swaggerDocs(app);

// Routes
app.use("/api/users", require('./routes/userRoutes.js'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/parties', require('./routes/partyRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use("/api/companies", require('./routes/companyRoutes'));
app.use("/api/reports", require("./routes/reportRoutes"));

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`Database connected! Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection failed');
  }
});

app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => {
    console.log("app is running on port ", PORT);
})


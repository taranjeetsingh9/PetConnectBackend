require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();


connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.use('/api/auth', require('./routes/auth'));

// Serve frontend for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

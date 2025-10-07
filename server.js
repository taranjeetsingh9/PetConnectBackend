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

app.use('/api/pets', require('./routes/pets'));

app.use("/api/users", require("./routes/userroutes"));

app.use('/api/organizations', require('./routes/organizations'));

const adoptionRoutes = 
app.use('/api/adoptions',require('./routes/adoptions'));

// // acitvity log routes
// app.use('/api/activity', require('./routes/activityLog'));

const activityLogRoutes = require('./routes/activityLog');
app.use('/api/activitylogs', activityLogRoutes);

// Serve frontend for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

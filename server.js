require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { setupSocket } = require('./server/socket');
const  chatRoutes = require('./routes/chatRoutes');
const petFiles = require('./routes/petFiles');


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

// adoptionRoutes
// const adoptionRoutes = app.use('/api/adoptions',require('./routes/adoptions'));
app.use('/api/adoptions', require('./routes/adoptions'));
// vet
app.use('/api/vet', require('./routes/vet'));

app.use('/api/pet-files', require('./routes/petFiles'));

const activityLogRoutes = require('./routes/activityLog');
app.use('/api/activitylogs', activityLogRoutes);

// In your server.js file, add this line with your other routes:
app.use('/api/notifications', require('./routes/notificationRoutes'));

// chat routes
app.use('/api/chats', require('./routes/chatRoutes'));

// foster chat routes
app.use('/api/foster-chats', require('./routes/fosterChatRoutes'));

// trainer routes
app.use('/api/trainer', require('./routes/trainer'));

// admin route
app.use('/api/admin', require('./routes/admin'));



// Serve frontend for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.io
setupSocket(server);
console.log('Socket.io server initialized');
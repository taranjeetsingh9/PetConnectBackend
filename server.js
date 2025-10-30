require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { setupSocket } = require('./server/socket');
const  chatRoutes = require('./routes/chatRoutes');
const petFiles = require('./routes/petFiles');
const reminderService = require('./services/reminderService');


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


// training
app.use('/api/training', require('./routes/trainingRoutes'));


// training route
const trainingRequestRoutes = require('./routes/trainingRequestRoutes');

// Later in the file, add to routes:
app.use('/api/training-requests', trainingRequestRoutes);

const availabilityRoutes = require('./routes/availabilityRoutes');
app.use('/api/availability', availabilityRoutes);


const agreementRoutes = require('./routes/agreements');
app.use('/api/agreements', agreementRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

const blockchainRoutes = require('./routes/blockchainRoutes');
app.use('/api/blockchain', blockchainRoutes);

const blockchainViewRoutes = require('./routes/blockchainViewRoutes');
app.use('/api/blockchain', blockchainViewRoutes);


// Run every hour to check for upcoming meetings
setInterval(async () => {
  try {
    const result = await reminderService.sendMeetingReminders();
    console.log(`⏰ Sent ${result.sent} meeting reminders`);
  } catch (error) {
    console.error('Error in reminder service:', error);
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.io
setupSocket(server);
console.log('Socket.io server initialized');
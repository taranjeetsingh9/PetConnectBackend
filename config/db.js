const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('⏳ Attempting MongoDB connection...');
    mongoose.set('debug', true); 
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
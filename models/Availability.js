const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['staff','vet','trainer'], required: true },
    slots: [{
      day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
      startTime: String, 
      endTime: String,
      date: Date,  
    }]
  }, { timestamps: true });

module.exports = mongoose.model('Availability', availabilitySchema);
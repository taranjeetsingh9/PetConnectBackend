const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true
    },
    vet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    diagnosis: {
        type: String,
        required: true
    },
    treatment: String,
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String
    }],
    notes: String,
    date: {
        type: Date,
        default: Date.now
    },
    nextCheckup: Date,
    followUpRequired: {
        type: Boolean,
        default: false
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
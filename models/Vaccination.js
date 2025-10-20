const mongoose = require('mongoose');

const VaccinationSchema = new mongoose.Schema({
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
    vaccineName: {
        type: String,
        required: true
    },
    dateAdministered: {
        type: Date,
        required: true
    },
    nextDueDate: {
        type: Date,
        required: true
    },
    notes: String,
    completed: {
        type: Boolean,
        default: true
    },
    boosterRequired: {
        type: Boolean,
        default: false
    },
    batchNumber: String,
    administeringVet: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Vaccination', VaccinationSchema);
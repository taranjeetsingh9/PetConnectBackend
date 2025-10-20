const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isVet = require('../middleware/isVet');
const Pet = require('../models/Pet');
const MedicalRecord = require('../models/MedicalRecord');
const Vaccination = require('../models/Vaccination');
const logActivity = require('../utils/logActivity');

// ✅ GET all pets assigned to current vet
router.get('/my-patients', auth, isVet, async (req, res) => {
    try {
        const pets = await Pet.find({ vet: req.user.id })
            .populate('organization', 'name')
            .select('name breed age gender status healthNotes medicalHistory vaccinations healthHistory');
        
        console.log(`📋 Vet ${req.user.id} fetching their patients`);
        
        res.json({
            success: true,
            count: pets.length,
            pets
        });
    } catch (error) {
        console.error('Get my patients error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching patients' 
        });
    }
});

// ✅ GET specific pet's full medical history
router.get('/pets/:petId/medical-history', auth, isVet, async (req, res) => {
    try {
        const petId = req.params.petId;
        console.log(`🔍 Vet ${req.user.id} fetching medical history for pet ${petId}`);

        const pet = await Pet.findById(petId)
            .populate('vet', 'name email')
            .populate('organization', 'name');

        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify vet has access to this pet
        if (pet.vet && pet.vet._id.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        // Get medical records
        const medicalRecords = await MedicalRecord.find({ pet: petId })
            .populate('vet', 'name email')
            .sort({ date: -1 });

        // Get vaccination records
        const vaccinations = await Vaccination.find({ pet: petId })
            .populate('vet', 'name email')
            .sort({ dateAdministered: -1 });

        res.json({
            success: true,
            pet: {
                _id: pet._id,
                name: pet.name,
                breed: pet.breed,
                age: pet.age,
                gender: pet.gender,
                status: pet.status,
                healthNotes: pet.healthNotes
            },
            medicalRecords,
            vaccinations
        });

    } catch (error) {
        console.error('Get medical history error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching medical history' 
        });
    }
});

// ✅ POST new medical record
router.post('/pets/:petId/medical-records', auth, isVet, async (req, res) => {
    try {
        const { diagnosis, treatment, medications, notes, nextCheckup, urgency } = req.body;
        const petId = req.params.petId;
        
        console.log(`🏥 Vet ${req.user.id} creating medical record for pet ${petId}`);

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify vet has access
        if (pet.vet && pet.vet.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const medicalRecord = new MedicalRecord({
            pet: petId,
            vet: req.user.id,
            diagnosis,
            treatment,
            medications: medications || [],
            notes,
            nextCheckup: nextCheckup ? new Date(nextCheckup) : undefined,
            urgency: urgency || 'low'
        });

        await medicalRecord.save();

        // Also update pet's healthHistory array
        pet.healthHistory.push({
            notes: `Medical record: ${diagnosis}`,
            updatedBy: req.user.id,
            updatedAt: new Date()
        });

        await pet.save();

        // Log activity
        await logActivity({
            userId: req.user.id,
            role: 'vet',
            action: 'Added Medical Record',
            target: petId,
            targetModel: 'Pet',
            details: `Added medical record for ${pet.name}: ${diagnosis}`
        });

        console.log(`✅ Medical record created for ${pet.name}`);

        res.status(201).json({
            success: true,
            message: 'Medical record created successfully',
            medicalRecord
        });

    } catch (error) {
        console.error('Create medical record error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while creating medical record' 
        });
    }
});

// ✅ POST new vaccination record
router.post('/pets/:petId/vaccinations', auth, isVet, async (req, res) => {
    try {
        const { vaccineName, dateAdministered, nextDueDate, notes, boosterRequired, batchNumber } = req.body;
        const petId = req.params.petId;
        
        console.log(`💉 Vet ${req.user.id} recording vaccination for pet ${petId}`);

        if (!vaccineName || !dateAdministered || !nextDueDate) {
            return res.status(400).json({
                success: false,
                msg: 'Vaccine name, date administered, and next due date are required'
            });
        }

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify vet has access
        if (pet.vet && pet.vet.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const vaccination = new Vaccination({
            pet: petId,
            vet: req.user.id,
            vaccineName,
            dateAdministered: new Date(dateAdministered),
            nextDueDate: new Date(nextDueDate),
            notes,
            boosterRequired: boosterRequired || false,
            batchNumber: batchNumber || ''
        });

        await vaccination.save();

        // Update pet's vaccinations array
        pet.vaccinations.push({
            name: vaccineName,
            date: new Date(dateAdministered)
        });

        await pet.save();

        // Log activity
        await logActivity({
            userId: req.user.id,
            role: 'vet',
            action: 'Added Vaccination',
            target: petId,
            targetModel: 'Pet',
            details: `Added vaccination for ${pet.name}: ${vaccineName}`
        });

        console.log(`✅ Vaccination recorded for ${pet.name}`);

        res.status(201).json({
            success: true,
            message: 'Vaccination recorded successfully',
            vaccination
        });

    } catch (error) {
        console.error('Create vaccination error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while recording vaccination' 
        });
    }
});

// ✅ GET overdue vaccinations
router.get('/overdue-vaccinations', auth, isVet, async (req, res) => {
    try {
        const today = new Date();
        console.log(`📅 Vet ${req.user.id} checking overdue vaccinations`);

        const overdueVaccinations = await Vaccination.find({
            vet: req.user.id,
            nextDueDate: { $lt: today },
            completed: true
        }).populate('pet', 'name breed age gender');

        res.json({
            success: true,
            count: overdueVaccinations.length,
            overdueVaccinations
        });
    } catch (error) {
        console.error('Get overdue vaccinations error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching overdue vaccinations' 
        });
    }
});

// ✅ GET upcoming checkups
router.get('/upcoming-checkups', auth, isVet, async (req, res) => {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        console.log(`📅 Vet ${req.user.id} checking upcoming checkups`);

        const upcomingCheckups = await MedicalRecord.find({
            vet: req.user.id,
            nextCheckup: { 
                $gte: today,
                $lte: nextWeek
            },
            followUpRequired: true
        }).populate('pet', 'name breed status');

        res.json({
            success: true,
            count: upcomingCheckups.length,
            upcomingCheckups
        });
    } catch (error) {
        console.error('Get upcoming checkups error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching upcoming checkups' 
        });
    }
});

module.exports = router;
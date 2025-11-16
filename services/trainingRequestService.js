// services/trainingRequestService.js
const TrainingRequest = require('../models/TrainingRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');

class TrainingRequestService {
    
    // Get available trainers
    async getAvailableTrainers() {
        try {
            const trainers = await User.find({ 
                role: 'trainer'
            })
            .select('name email specialization experience rating bio profileImage')
            .sort({ rating: -1 });

            return { success: true, trainers };
        } catch (error) {
            console.error('Get available trainers service error:', error);
            return { success: false, msg: 'Error fetching trainers' };
        }
    }

    async createTrainingRequest(requestData) {
        console.log('🔍 SERVICE: createTrainingRequest called with:', requestData);

        try {
            const { petId, adopterId, trainerId, sessionType, preferredDates, notes } = requestData;

            //  TEMPORARY: Skip adoption verification for testing
            console.log('⚠️ TEMPORARY: Bypassing adoption check for development');
            
            // Just verify pet exists
            const pet = await Pet.findById(petId);
            if (!pet) {
                return { success: false, msg: 'Pet not found', status: 404 };
            }

            // Verify trainer exists
            const trainer = await User.findById(trainerId);
            if (!trainer || trainer.role !== 'trainer') {
                return { success: false, msg: 'Trainer not found', status: 404 };
            }

            console.log(' SERVICE: Pet and trainer verified');

            // Create training request
            const trainingRequest = new TrainingRequest({
                pet: petId,
                adopter: adopterId,
                trainer: trainerId,
                sessionType,
                preferredDates,
                notes,
                price: this.calculateSessionPrice(sessionType),
                duration: this.calculateSessionDuration(sessionType)
            });

            await trainingRequest.save();
            console.log('SERVICE: Training request saved to database');

            return { 
                success: true, 
                message: 'Training request submitted successfully!',
                trainingRequest 
            };

        } catch (error) {
            console.error(' SERVICE: Error in createTrainingRequest:', error);
            return { success: false, msg: 'Error creating training request: ' + error.message };
        }
    }

    // Get adopter's training requests
    async getAdopterRequests(adopterId) {
        try {
            const requests = await TrainingRequest.find({ adopter: adopterId })
                .populate('pet', 'name breed images')
                .populate('trainer', 'name email specialization')
                .sort({ createdAt: -1 });

            return { success: true, requests };
        } catch (error) {
            console.error('Get adopter requests service error:', error);
            return { success: false, msg: 'Error fetching training requests' };
        }
    }

    // Get trainer's received requests
    async getTrainerRequests(trainerId, status = null) {
        try {
            const query = { trainer: trainerId };
            if (status) query.status = status;

            const requests = await TrainingRequest.find(query)
                .populate('pet', 'name breed age images')
                .populate('adopter', 'name email')
                .sort({ createdAt: -1 });

            return { success: true, requests };
        } catch (error) {
            console.error('Get trainer requests service error:', error);
            return { success: false, msg: 'Error fetching training requests' };
        }
    }

    // Update request status (approve/reject)
    async updateRequestStatus(requestId, trainerId, status, responseData = {}) {
        try {
            const request = await TrainingRequest.findById(requestId);
            if (!request) {
                return { success: false, msg: 'Training request not found', status: 404 };
            }

            if (request.trainer.toString() !== trainerId) {
                return { success: false, msg: 'Not authorized to update this request', status: 403 };
            }

            request.status = status;
            request.trainerResponse = {
                responseDate: new Date(),
                message: responseData.message,
                proposedDate: responseData.proposedDate,
                proposedTime: responseData.proposedTime
            };

            await request.save();

            return { 
                success: true, 
                message: `Training request ${status} successfully`,
                request 
            };

        } catch (error) {
            console.error('Update request status service error:', error);
            return { success: false, msg: 'Error updating training request' };
        }
    }

    // Cancel training request
    async cancelTrainingRequest(requestId, adopterId) {
        try {
            const request = await TrainingRequest.findById(requestId);
            if (!request) {
                return { success: false, msg: 'Training request not found', status: 404 };
            }

            if (request.adopter.toString() !== adopterId) {
                return { success: false, msg: 'Not authorized to cancel this request', status: 403 };
            }

            request.status = 'cancelled';
            await request.save();

            return { 
                success: true, 
                message: 'Training request cancelled successfully',
                request 
            };

        } catch (error) {
            console.error('Cancel training request service error:', error);
            return { success: false, msg: 'Error cancelling training request' };
        }
    }

    // Helper methods
    calculateSessionPrice(sessionType) {
        const priceMap = {
            'basic_obedience': 50,
            'advanced_obedience': 75,
            'behavior_modification': 100,
            'socialization': 60,
            'leash_training': 45,
            'therapy_prep': 120
        };
        return priceMap[sessionType] || 50;
    }

    calculateSessionDuration(sessionType) {
        const durationMap = {
            'basic_obedience': 60,
            'advanced_obedience': 90,
            'behavior_modification': 120,
            'socialization': 60,
            'leash_training': 45,
            'therapy_prep': 90
        };
        return durationMap[sessionType] || 60;
    }
}

module.exports = new TrainingRequestService();
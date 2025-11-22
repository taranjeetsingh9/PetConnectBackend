// controllers/trainingRequestController.js
const trainingRequestService = require('../services/trainingRequestService');

class TrainingRequestController {
    
    // Get available trainers
    async getAvailableTrainers(req, res) {
        try {
            // console.log(`User ${req.user.id} fetching available trainers`);
            const result = await trainingRequestService.getAvailableTrainers();
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Get available trainers controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while fetching trainers' 
            });
        }
    }

    // Create training request
    async createTrainingRequest(req, res) {
        try {
            const { trainerId, sessionType, preferredDates, notes, location, specialInstructions } = req.body;
            const petId = req.params.petId;

            // console.log(` Adopter ${req.user.id} requesting training for pet ${petId}`);

            const requestData = {
                petId,
                adopterId: req.user.id,
                trainerId,
                sessionType,
                preferredDates,
                notes,
                location,
                specialInstructions
            };

            const result = await trainingRequestService.createTrainingRequest(requestData);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            res.status(201).json(result);
        } catch (error) {
            console.error('Create training request controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while creating training request' 
            });
        }
    }

    // Get adopter's training requests
    async getAdopterRequests(req, res) {
        try {
            console.log(`Adopter ${req.user.id} fetching their training requests`);
            const result = await trainingRequestService.getAdopterRequests(req.user.id);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Get adopter requests controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while fetching training requests' 
            });
        }
    }

    // Get trainer's received requests
    async getTrainerRequests(req, res) {
        try {
            const { status } = req.query;
            console.log(`� Trainer ${req.user.id} fetching training requests`);
            const result = await trainingRequestService.getTrainerRequests(req.user.id, status);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Get trainer requests controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while fetching training requests' 
            });
        }
    }

    // Approve training request
    async approveTrainingRequest(req, res) {
        try {
            const { message, proposedDate, proposedTime } = req.body;
            const requestId = req.params.requestId;

            console.log(`Trainer ${req.user.id} approving request ${requestId}`);

            const responseData = { message, proposedDate, proposedTime };
            const result = await trainingRequestService.updateRequestStatus(
                requestId, 
                req.user.id, 
                'approved', 
                responseData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Approve training request controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while approving training request' 
            });
        }
    }

    // Reject training request
    async rejectTrainingRequest(req, res) {
        try {
            const { message } = req.body;
            const requestId = req.params.requestId;

            console.log(` Trainer ${req.user.id} rejecting request ${requestId}`);

            const responseData = { message };
            const result = await trainingRequestService.updateRequestStatus(
                requestId, 
                req.user.id, 
                'rejected', 
                responseData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Reject training request controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while rejecting training request' 
            });
        }
    }

    // Cancel training request
    async cancelTrainingRequest(req, res) {
        try {
            const requestId = req.params.requestId;
            console.log(` Adopter ${req.user.id} cancelling request ${requestId}`);

            const result = await trainingRequestService.cancelTrainingRequest(requestId, req.user.id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Cancel training request controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while cancelling training request' 
            });
        }
    }

    // Get training request by ID
    async getTrainingRequestById(req, res) {
        try {
            const requestId = req.params.requestId;
            console.log(`� User ${req.user.id} fetching request ${requestId}`);

            // For now, return a simple response
            res.json({ 
                success: true,
                message: 'Get training request by ID endpoint working',
                requestId: requestId
            });
        } catch (error) {
            console.error('Get training request by ID controller error:', error);
            res.status(500).json({ 
                success: false,
                msg: 'Server error while fetching training request' 
            });
        }
    }
}

module.exports = new TrainingRequestController();

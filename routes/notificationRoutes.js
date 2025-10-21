const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/notificationController');

router.get('/', auth, controller.getAll);
router.patch('/:id/read', auth, controller.markOneAsRead);
router.patch('/read-all', auth, controller.markAllAsRead);
router.delete('/:id', auth, controller.deleteOne);

module.exports = router;
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleAuth = require('../middleware/roleAuth');
const userController = require('../controllers/userController');
const { avatarUpload } = require('../middleware/upload');

// User Profile Routes
router.patch("/profile", auth, userController.updateProfile);
router.get("/me", auth, userController.getCurrentUser);
router.get("/stats", auth, userController.getUserStats);

// Activity Routes
router.get("/activity-logs/:userId", auth, userController.getUserActivityLogs);

// Favorites Routes
router.post("/favorites/:petId", auth, userController.addFavorite);
router.delete("/favorites/:petId", auth, userController.removeFavorite);

// Avatar Upload
router.post("/upload-avatar", auth, avatarUpload.single('avatar'), userController.uploadAvatar);

// Role-based Routes
router.get("/vets", auth, roleAuth(['staff', 'admin']), userController.getVets);
router.get("/trainers", auth, roleAuth(['staff', 'admin']), userController.getTrainers);

module.exports = router;
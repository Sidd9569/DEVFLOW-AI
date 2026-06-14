const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);
router.get('/activity', profileController.getActivityLog);
router.delete('/', profileController.deleteAccount);

module.exports = router;
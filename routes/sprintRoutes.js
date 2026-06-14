const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const auth = require('../middleware/auth');

router.use(auth);

// Ensure sprint page cannot be accessed if the token is missing/invalid
// (auth middleware already returns 401, but this prevents front-end redirect loops).
router.get('/', sprintController.getSprints);
router.get('/stats/:productId', sprintController.getSprintStats);
router.post('/', sprintController.createSprint);
router.get('/:id', sprintController.getSprint);
router.put('/:id', sprintController.updateSprint);
router.delete('/:id', sprintController.deleteSprint);

module.exports = router;
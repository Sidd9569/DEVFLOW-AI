const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', issueController.getIssues);
router.get('/stats', issueController.getIssueStats);
router.post('/', issueController.createIssue);
router.get('/:id', issueController.getIssue);
router.put('/:id', issueController.updateIssue);
router.delete('/:id', issueController.deleteIssue);
router.post('/:id/comments', issueController.addIssueComment);

module.exports = router;
const express = require('express');
const { getSummary, compareRanges } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/compare', compareRanges);

module.exports = router;

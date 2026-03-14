const express = require('express');
const { getByBusiness, create } = require('../controllers/visitController');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getByBusiness);
router.post('/', create);

module.exports = router;

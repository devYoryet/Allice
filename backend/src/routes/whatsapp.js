const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getByBusiness, create } = require('../controllers/whatsappController');

const router = express.Router({ mergeParams: true }); // mergeParams para heredar :businessId

router.get('/',  authenticate, getByBusiness);
router.post('/', authenticate, create);

module.exports = router;

const express = require('express');
const { getByBusiness, getAll, create, update } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getByBusiness);
router.post('/', create);
router.put('/:id', update);

module.exports = router;

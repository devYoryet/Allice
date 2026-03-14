const express = require('express');
const { getAll, getOne, create, update, remove, getUpcoming } = require('../controllers/businessController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/upcoming', getUpcoming);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;

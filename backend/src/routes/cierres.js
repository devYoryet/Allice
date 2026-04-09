const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createCierre,
  getCierres,
  getCierreById,
  getResumenActual,
} = require('../controllers/cierreController');

const router = express.Router();

router.get('/resumen-actual', authenticate, getResumenActual);
router.get('/',               authenticate, getCierres);
router.get('/:id',            authenticate, getCierreById);
router.post('/',              authenticate, createCierre);

module.exports = router;

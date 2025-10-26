const express = require('express');
const MovimentoController = require('../controllers/MovimentoController');

const router = express.Router();

router.get('/', MovimentoController.index);
router.get('/:id', MovimentoController.show);
router.post('/', MovimentoController.store);
router.put('/:id', MovimentoController.update);
router.patch('/:id/toggle-pago', MovimentoController.togglePago);
router.delete('/:id', MovimentoController.delete);

module.exports = router;

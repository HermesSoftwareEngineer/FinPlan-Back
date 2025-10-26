const express = require('express');
const CartaoCreditoController = require('../controllers/CartaoCreditoController');

const router = express.Router();

router.get('/', CartaoCreditoController.index);
router.get('/:id', CartaoCreditoController.show);
router.post('/', CartaoCreditoController.store);
router.put('/:id', CartaoCreditoController.update);
router.delete('/:id', CartaoCreditoController.destroy);

module.exports = router;

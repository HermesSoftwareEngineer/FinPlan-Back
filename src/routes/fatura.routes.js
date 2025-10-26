const express = require('express');
const FaturaController = require('../controllers/FaturaController');

const router = express.Router();

router.get('/', FaturaController.index);
router.get('/:id', FaturaController.show);
router.post('/', FaturaController.store);
router.put('/:id', FaturaController.update);
router.post('/:id/pagar', FaturaController.pagarFatura);
router.delete('/:id', FaturaController.destroy);

// Rotas para gerenciar movimentos da fatura
router.get('/:id/movimentos', FaturaController.getMovimentos);
router.post('/:id/movimentos', FaturaController.addMovimento);
router.put('/:id/movimentos/:movimento_id', FaturaController.updateMovimento);

module.exports = router;

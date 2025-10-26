const express = require('express');
const FaturaController = require('../controllers/FaturaController');

const router = express.Router();

router.get('/', FaturaController.index);
router.get('/:id', FaturaController.show);
router.post('/', FaturaController.store);
router.put('/:id', FaturaController.update);
router.delete('/:id', FaturaController.delete);

module.exports = router;

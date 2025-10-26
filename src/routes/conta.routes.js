const express = require('express');
const ContaController = require('../controllers/ContaController');

const router = express.Router();

router.get('/', ContaController.index);
router.get('/:id', ContaController.show);
router.post('/', ContaController.store);
router.put('/:id', ContaController.update);
router.delete('/:id', ContaController.delete);

module.exports = router;

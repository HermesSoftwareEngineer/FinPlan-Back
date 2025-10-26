const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');

const router = express.Router();

router.get('/', CategoriaController.index);
router.get('/:id', CategoriaController.show);
router.post('/', CategoriaController.store);
router.put('/:id', CategoriaController.update);
router.delete('/:id', CategoriaController.delete);

module.exports = router;

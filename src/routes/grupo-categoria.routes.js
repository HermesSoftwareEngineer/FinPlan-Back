const express = require('express');
const GrupoCategoriaController = require('../controllers/GrupoCategoriaController');

const router = express.Router();

router.get('/', GrupoCategoriaController.index);
router.get('/:id', GrupoCategoriaController.show);
router.post('/', GrupoCategoriaController.store);
router.put('/:id', GrupoCategoriaController.update);
router.delete('/:id', GrupoCategoriaController.delete);

module.exports = router;

const express = require('express');
const DreController = require('../controllers/DreController');

const router = express.Router();

router.get('/', DreController.index);

module.exports = router;

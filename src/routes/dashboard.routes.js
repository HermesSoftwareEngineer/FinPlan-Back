const express = require('express');
const DashboardController = require('../controllers/DashboardController');

const routes = express.Router();

/**
 * GET /dashboard
 * Retorna dados consolidados para o dashboard
 * Query params opcionais:
 * - data_inicio: Data inicial para filtro do gráfico (YYYY-MM-DD)
 * - data_fim: Data final para filtro do gráfico (YYYY-MM-DD)
 */
routes.get('/', DashboardController.index);

module.exports = routes;

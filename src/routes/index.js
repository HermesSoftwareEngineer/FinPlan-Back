const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const contaRoutes = require('./conta.routes');
const grupoCategoriaRoutes = require('./grupo-categoria.routes');
const categoriaRoutes = require('./categoria.routes');
const cartaoRoutes = require('./cartao.routes');
const faturaRoutes = require('./fatura.routes');
const movimentoRoutes = require('./movimento.routes');
const dreRoutes = require('./dre.routes');
const dashboardRoutes = require('./dashboard.routes');
const authMiddleware = require('../middlewares/auth');

const routes = express.Router();

// Rotas de autenticação (públicas)
routes.use('/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
routes.use('/user', userRoutes);
routes.use('/contas', authMiddleware, contaRoutes);
routes.use('/grupos-categorias', authMiddleware, grupoCategoriaRoutes);
routes.use('/categorias', authMiddleware, categoriaRoutes);
routes.use('/cartoes', authMiddleware, cartaoRoutes);
routes.use('/faturas', authMiddleware, faturaRoutes);
routes.use('/movimentos', authMiddleware, movimentoRoutes);
routes.use('/dre', authMiddleware, dreRoutes);
routes.use('/dashboard', authMiddleware, dashboardRoutes);

// Rota de health check
routes.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'FinPlan API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

module.exports = routes;

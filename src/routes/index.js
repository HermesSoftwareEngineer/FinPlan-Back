const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

const routes = express.Router();

// Rotas de autenticação (públicas)
routes.use('/auth', authRoutes);

// Rotas de usuário (protegidas)
routes.use('/user', userRoutes);

// Rota de health check
routes.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'FinPlan API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

module.exports = routes;

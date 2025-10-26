const express = require('express');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(authMiddleware);

// Rota de perfil do usuário
router.get('/profile', (req, res) => {
  res.json({ 
    message: 'Perfil acessado com sucesso!',
    userId: req.userId,
    userEmail: req.userEmail
  });
});

// Aqui você pode adicionar outras rotas de usuário
// router.put('/profile', ...) - Atualizar perfil
// router.delete('/account', ...) - Deletar conta
// etc.

module.exports = router;

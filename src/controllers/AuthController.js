const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  // Cadastro de usuário
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Verificar se o usuário já existe
      const userExists = await User.findOne({ where: { email } });
      
      if (userExists) {
        return res.status(400).json({ 
          error: 'Usuário já cadastrado com este email' 
        });
      }

      // Criar novo usuário
      const user = await User.create({
        name,
        email,
        password,
      });

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message)
        });
      }
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor ao cadastrar usuário' 
      });
    }
  }

  // Login de usuário
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar dados
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      // Buscar usuário
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ 
          error: 'Email ou senha incorretos' 
        });
      }

      // Verificar senha
      const isPasswordValid = await user.checkPassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Email ou senha incorretos' 
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor ao fazer login' 
      });
    }
  }
}

module.exports = new AuthController();

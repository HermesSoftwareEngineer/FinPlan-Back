const { models } = require('../models');
const { Conta } = models;

class ContaController {
  // Listar todas as contas do usuário
  async index(req, res) {
    try {
      const contas = await Conta.findAll({
        where: { user_id: req.userId },
        order: [['created_at', 'DESC']],
      });

      return res.json(contas);
    } catch (error) {
      console.error('Erro ao listar contas:', error);
      return res.status(500).json({ error: 'Erro ao listar contas' });
    }
  }

  // Buscar uma conta específica
  async show(req, res) {
    try {
      const { id } = req.params;

      const conta = await Conta.findOne({
        where: { id, user_id: req.userId },
      });

      if (!conta) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      return res.json(conta);
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
      return res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  }

  // Criar nova conta
  async store(req, res) {
    try {
      const { nome, tipo, saldo_inicial, cor, ativa } = req.body;

      const conta = await Conta.create({
        nome,
        tipo,
        saldo_inicial,
        saldo_atual: saldo_inicial || 0,
        cor,
        ativa,
        user_id: req.userId,
      });

      return res.status(201).json(conta);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar conta' });
    }
  }

  // Atualizar conta
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, tipo, saldo_inicial, cor, ativa } = req.body;

      const conta = await Conta.findOne({
        where: { id, user_id: req.userId },
      });

      if (!conta) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      await conta.update({
        nome,
        tipo,
        saldo_inicial,
        cor,
        ativa,
      });

      return res.json(conta);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  }

  // Deletar conta
  async delete(req, res) {
    try {
      const { id } = req.params;

      const conta = await Conta.findOne({
        where: { id, user_id: req.userId },
      });

      if (!conta) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      await conta.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      return res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  }
}

module.exports = new ContaController();

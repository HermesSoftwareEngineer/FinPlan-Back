const { models } = require('../models');
const { CartaoCredito } = models;

class CartaoCreditoController {
  // Listar todos os cartões do usuário
  async index(req, res) {
    try {
      const cartoes = await CartaoCredito.findAll({
        where: { user_id: req.userId },
        order: [['nome', 'ASC']],
      });

      return res.json(cartoes);
    } catch (error) {
      console.error('Erro ao listar cartões:', error);
      return res.status(500).json({ error: 'Erro ao listar cartões' });
    }
  }

  // Buscar um cartão específico
  async show(req, res) {
    try {
      const { id } = req.params;

      const cartao = await CartaoCredito.findOne({
        where: { id, user_id: req.userId },
      });

      if (!cartao) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      return res.json(cartao);
    } catch (error) {
      console.error('Erro ao buscar cartão:', error);
      return res.status(500).json({ error: 'Erro ao buscar cartão' });
    }
  }

  // Criar novo cartão
  async store(req, res) {
    try {
      const { nome, limite, dia_fechamento, dia_vencimento, bandeira, ultimos_digitos, cor, ativo } = req.body;

      const cartao = await CartaoCredito.create({
        nome,
        limite,
        dia_fechamento,
        dia_vencimento,
        bandeira,
        ultimos_digitos,
        cor,
        ativo,
        user_id: req.userId,
      });

      return res.status(201).json(cartao);
    } catch (error) {
      console.error('Erro ao criar cartão:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar cartão' });
    }
  }

  // Atualizar cartão
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, limite, dia_fechamento, dia_vencimento, bandeira, ultimos_digitos, cor, ativo } = req.body;

      const cartao = await CartaoCredito.findOne({
        where: { id, user_id: req.userId },
      });

      if (!cartao) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      await cartao.update({
        nome,
        limite,
        dia_fechamento,
        dia_vencimento,
        bandeira,
        ultimos_digitos,
        cor,
        ativo,
      });

      return res.json(cartao);
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar cartão' });
    }
  }

  // Deletar cartão
  async delete(req, res) {
    try {
      const { id } = req.params;

      const cartao = await CartaoCredito.findOne({
        where: { id, user_id: req.userId },
      });

      if (!cartao) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      await cartao.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar cartão:', error);
      return res.status(500).json({ error: 'Erro ao deletar cartão' });
    }
  }
}

module.exports = new CartaoCreditoController();

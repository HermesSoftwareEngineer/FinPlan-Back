const { models } = require('../models');
const { Fatura, CartaoCredito, Movimento } = models;

class FaturaController {
  // Listar todas as faturas do usuário
  async index(req, res) {
    try {
      const { cartao_id, status } = req.query;

      // Buscar cartões do usuário
      const cartoesUsuario = await CartaoCredito.findAll({
        where: { user_id: req.userId },
        attributes: ['id'],
      });

      const cartoesIds = cartoesUsuario.map(c => c.id);

      const where = { cartao_id: cartoesIds };
      
      if (cartao_id) {
        where.cartao_id = cartao_id;
      }
      
      if (status) {
        where.status = status;
      }

      const faturas = await Fatura.findAll({
        where,
        include: [
          {
            association: 'cartao',
            attributes: ['id', 'nome', 'bandeira'],
          },
        ],
        order: [['ano_referencia', 'DESC'], ['mes_referencia', 'DESC']],
      });

      return res.json(faturas);
    } catch (error) {
      console.error('Erro ao listar faturas:', error);
      return res.status(500).json({ error: 'Erro ao listar faturas' });
    }
  }

  // Buscar uma fatura específica
  async show(req, res) {
    try {
      const { id } = req.params;

      const fatura = await Fatura.findOne({
        where: { id },
        include: [
          {
            association: 'cartao',
            where: { user_id: req.userId },
          },
          {
            association: 'movimentos',
            include: ['categoria'],
          },
        ],
      });

      if (!fatura) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      return res.json(fatura);
    } catch (error) {
      console.error('Erro ao buscar fatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar fatura' });
    }
  }

  // Criar nova fatura
  async store(req, res) {
    try {
      const { mes_referencia, ano_referencia, data_fechamento, data_vencimento, cartao_id } = req.body;

      // Verificar se o cartão pertence ao usuário
      const cartao = await CartaoCredito.findOne({
        where: { id: cartao_id, user_id: req.userId },
      });

      if (!cartao) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      const fatura = await Fatura.create({
        mes_referencia,
        ano_referencia,
        data_fechamento,
        data_vencimento,
        cartao_id,
      });

      return res.status(201).json(fatura);
    } catch (error) {
      console.error('Erro ao criar fatura:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar fatura' });
    }
  }

  // Atualizar fatura
  async update(req, res) {
    try {
      const { id } = req.params;
      const { status, valor_pago } = req.body;

      const fatura = await Fatura.findOne({
        where: { id },
        include: [
          {
            association: 'cartao',
            where: { user_id: req.userId },
          },
        ],
      });

      if (!fatura) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      await fatura.update({
        status,
        valor_pago,
      });

      return res.json(fatura);
    } catch (error) {
      console.error('Erro ao atualizar fatura:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }

  // Deletar fatura
  async delete(req, res) {
    try {
      const { id } = req.params;

      const fatura = await Fatura.findOne({
        where: { id },
        include: [
          {
            association: 'cartao',
            where: { user_id: req.userId },
          },
        ],
      });

      if (!fatura) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      await fatura.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar fatura:', error);
      return res.status(500).json({ error: 'Erro ao deletar fatura' });
    }
  }
}

module.exports = new FaturaController();

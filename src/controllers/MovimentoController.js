const { models } = require('../models');
const { Movimento, Conta } = models;
const { Op } = require('sequelize');

class MovimentoController {
  // Listar todos os movimentos do usuário
  async index(req, res) {
    try {
      const { tipo, pago, data_inicio, data_fim, conta_id, categoria_id } = req.query;

      const where = { user_id: req.userId };

      if (tipo) {
        where.tipo = tipo;
      }

      if (pago !== undefined) {
        where.pago = pago === 'true';
      }

      if (data_inicio && data_fim) {
        where.data = {
          [Op.between]: [data_inicio, data_fim],
        };
      } else if (data_inicio) {
        where.data = {
          [Op.gte]: data_inicio,
        };
      } else if (data_fim) {
        where.data = {
          [Op.lte]: data_fim,
        };
      }

      if (conta_id) {
        where.conta_id = conta_id;
      }

      if (categoria_id) {
        where.categoria_id = categoria_id;
      }

      const movimentos = await Movimento.findAll({
        where,
        include: [
          {
            association: 'conta',
            attributes: ['id', 'nome', 'tipo'],
          },
          {
            association: 'categoria',
            attributes: ['id', 'nome', 'tipo', 'cor', 'icone'],
          },
          {
            association: 'fatura',
            attributes: ['id', 'mes_referencia', 'ano_referencia'],
            include: ['cartao'],
          },
        ],
        order: [['data', 'DESC'], ['created_at', 'DESC']],
      });

      return res.json(movimentos);
    } catch (error) {
      console.error('Erro ao listar movimentos:', error);
      return res.status(500).json({ error: 'Erro ao listar movimentos' });
    }
  }

  // Buscar um movimento específico
  async show(req, res) {
    try {
      const { id } = req.params;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
        include: ['conta', 'categoria', 'fatura'],
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      return res.json(movimento);
    } catch (error) {
      console.error('Erro ao buscar movimento:', error);
      return res.status(500).json({ error: 'Erro ao buscar movimento' });
    }
  }

  // Criar novo movimento
  async store(req, res) {
    try {
      const {
        descricao,
        valor,
        tipo,
        data,
        observacao,
        pago,
        recorrente,
        parcelado,
        numero_parcela,
        total_parcelas,
        conta_id,
        categoria_id,
        fatura_id,
      } = req.body;

      // Verificar se a conta pertence ao usuário (se fornecida)
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }

        // Atualizar saldo da conta se o movimento estiver pago
        if (pago) {
          const valorMovimento = parseFloat(valor);
          if (tipo === 'receita') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
          } else if (tipo === 'despesa') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
          }
          await conta.save();
        }
      }

      const movimento = await Movimento.create({
        descricao,
        valor,
        tipo,
        data,
        observacao,
        pago,
        recorrente,
        parcelado,
        numero_parcela,
        total_parcelas,
        conta_id,
        categoria_id,
        fatura_id,
        user_id: req.userId,
      });

      // Recarregar com associações
      const movimentoCompleto = await Movimento.findByPk(movimento.id, {
        include: ['conta', 'categoria', 'fatura'],
      });

      return res.status(201).json(movimentoCompleto);
    } catch (error) {
      console.error('Erro ao criar movimento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar movimento' });
    }
  }

  // Atualizar movimento
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        descricao,
        valor,
        tipo,
        data,
        observacao,
        pago,
        recorrente,
        parcelado,
        numero_parcela,
        total_parcelas,
        conta_id,
        categoria_id,
        fatura_id,
      } = req.body;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      // Reverter o saldo anterior se necessário
      if (movimento.pago && movimento.conta_id) {
        const contaAnterior = await Conta.findByPk(movimento.conta_id);
        if (contaAnterior) {
          const valorAnterior = parseFloat(movimento.valor);
          if (movimento.tipo === 'receita') {
            contaAnterior.saldo_atual = parseFloat(contaAnterior.saldo_atual) - valorAnterior;
          } else if (movimento.tipo === 'despesa') {
            contaAnterior.saldo_atual = parseFloat(contaAnterior.saldo_atual) + valorAnterior;
          }
          await contaAnterior.save();
        }
      }

      // Atualizar movimento
      await movimento.update({
        descricao,
        valor,
        tipo,
        data,
        observacao,
        pago,
        recorrente,
        parcelado,
        numero_parcela,
        total_parcelas,
        conta_id,
        categoria_id,
        fatura_id,
      });

      // Aplicar novo saldo se necessário
      if (pago && conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (conta) {
          const valorMovimento = parseFloat(valor);
          if (tipo === 'receita') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
          } else if (tipo === 'despesa') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
          }
          await conta.save();
        }
      }

      // Recarregar com associações
      const movimentoAtualizado = await Movimento.findByPk(id, {
        include: ['conta', 'categoria', 'fatura'],
      });

      return res.json(movimentoAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar movimento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar movimento' });
    }
  }

  // Deletar movimento
  async delete(req, res) {
    try {
      const { id } = req.params;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      // Reverter o saldo se o movimento estava pago
      if (movimento.pago && movimento.conta_id) {
        const conta = await Conta.findByPk(movimento.conta_id);
        if (conta) {
          const valorMovimento = parseFloat(movimento.valor);
          if (movimento.tipo === 'receita') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
          } else if (movimento.tipo === 'despesa') {
            conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
          }
          await conta.save();
        }
      }

      await movimento.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar movimento:', error);
      return res.status(500).json({ error: 'Erro ao deletar movimento' });
    }
  }

  // Marcar movimento como pago/não pago
  async togglePago(req, res) {
    try {
      const { id } = req.params;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      const novoPago = !movimento.pago;

      // Atualizar saldo da conta
      if (movimento.conta_id) {
        const conta = await Conta.findByPk(movimento.conta_id);
        if (conta) {
          const valorMovimento = parseFloat(movimento.valor);
          
          if (novoPago) {
            // Marcar como pago
            if (movimento.tipo === 'receita') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
            } else if (movimento.tipo === 'despesa') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
            }
          } else {
            // Marcar como não pago
            if (movimento.tipo === 'receita') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
            } else if (movimento.tipo === 'despesa') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
            }
          }
          
          await conta.save();
        }
      }

      await movimento.update({ pago: novoPago });

      return res.json(movimento);
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status de pagamento' });
    }
  }
}

module.exports = new MovimentoController();

const { models } = require('../models');
const { Conta, Movimento } = models;

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

  // Ajustar saldo inicial da conta
  async ajustarSaldoInicial(req, res) {
    try {
      const { id } = req.params;
      const { novo_saldo_inicial } = req.body;

      if (novo_saldo_inicial === undefined || novo_saldo_inicial === null) {
        return res.status(400).json({ error: 'O campo novo_saldo_inicial é obrigatório' });
      }

      const conta = await Conta.findOne({
        where: { id, user_id: req.userId },
      });

      if (!conta) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      // Calcular a diferença entre os saldos
      const diferenca = parseFloat(novo_saldo_inicial) - parseFloat(conta.saldo_inicial);

      // Atualizar os saldos
      conta.saldo_inicial = novo_saldo_inicial;
      conta.saldo_atual = parseFloat(conta.saldo_atual) + diferenca;
      await conta.save();

      return res.json({
        message: 'Saldo inicial ajustado com sucesso',
        conta,
        ajuste: {
          saldo_inicial_anterior: parseFloat(conta.saldo_inicial) - diferenca,
          novo_saldo_inicial: parseFloat(conta.saldo_inicial),
          diferenca: diferenca,
        },
      });
    } catch (error) {
      console.error('Erro ao ajustar saldo inicial:', error);
      return res.status(500).json({ error: 'Erro ao ajustar saldo inicial' });
    }
  }

  // Lançar movimento de ajuste de saldo
  async lancarAjusteSaldo(req, res) {
    try {
      const { id } = req.params;
      const { valor_ajuste, descricao, data_competencia } = req.body;

      if (valor_ajuste === undefined || valor_ajuste === null) {
        return res.status(400).json({ error: 'O campo valor_ajuste é obrigatório' });
      }

      const conta = await Conta.findOne({
        where: { id, user_id: req.userId },
      });

      if (!conta) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      // Determinar o tipo do movimento baseado no valor
      const valorAjuste = parseFloat(valor_ajuste);
      const tipo = valorAjuste >= 0 ? 'receita' : 'despesa';
      const valorAbsoluto = Math.abs(valorAjuste);

      // Criar movimento de ajuste
      const movimento = await Movimento.create({
        descricao: descricao || `Ajuste de saldo - ${tipo === 'receita' ? 'Entrada' : 'Saída'}`,
        valor: valorAbsoluto,
        tipo: tipo,
        data_competencia: data_competencia || new Date().toISOString().split('T')[0],
        data_pagamento: new Date().toISOString().split('T')[0],
        observacao: 'Movimento automático de ajuste de saldo',
        pago: true,
        recorrente: false,
        parcelado: false,
        conta_id: conta.id,
        categoria_id: null,
        fatura_id: null,
        user_id: req.userId,
      });

      // Atualizar saldo da conta
      conta.saldo_atual = parseFloat(conta.saldo_atual) + valorAjuste;
      await conta.save();

      // Recarregar movimento com associações
      const movimentoCompleto = await Movimento.findByPk(movimento.id, {
        include: ['conta', 'categoria', 'fatura'],
      });

      return res.status(201).json({
        message: 'Ajuste de saldo lançado com sucesso',
        movimento: movimentoCompleto,
        conta: {
          id: conta.id,
          nome: conta.nome,
          saldo_anterior: parseFloat(conta.saldo_atual) - valorAjuste,
          saldo_atual: parseFloat(conta.saldo_atual),
          ajuste: valorAjuste,
        },
      });
    } catch (error) {
      console.error('Erro ao lançar ajuste de saldo:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao lançar ajuste de saldo' });
    }
  }
}

module.exports = new ContaController();

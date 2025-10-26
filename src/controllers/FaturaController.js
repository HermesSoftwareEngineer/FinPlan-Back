const { models } = require('../models');
const { Fatura, CartaoCredito, Movimento, Conta } = models;
const { Op } = require('sequelize');

class FaturaController {
  // Listar todas as faturas do usuário
  index = async (req, res) => {
    try {
      const { cartao_id, status, ano, mes } = req.query;

      // Buscar cartões do usuário
      const cartoesUsuario = await CartaoCredito.findAll({
        where: { user_id: req.userId },
        attributes: ['id'],
      });

      const cartoesIds = cartoesUsuario.map(c => c.id);

      if (cartoesIds.length === 0) {
        return res.json([]);
      }

      const where = { cartao_id: { [Op.in]: cartoesIds } };
      
      if (cartao_id) {
        where.cartao_id = cartao_id;
      }
      
      if (status) {
        where.status = status;
      }

      if (ano) {
        where.ano_referencia = parseInt(ano);
      }

      if (mes) {
        where.mes_referencia = parseInt(mes);
      }

      const faturas = await Fatura.findAll({
        where,
        include: [
          {
            association: 'cartao',
            attributes: ['id', 'nome', 'bandeira', 'limite', 'limite_utilizado'],
          },
          {
            association: 'conta',
            attributes: ['id', 'nome', 'tipo'],
          },
          {
            association: 'movimento_pagamento',
            attributes: ['id', 'descricao', 'valor', 'data_competencia', 'data_pagamento', 'pago'],
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
  show = async (req, res) => {
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
            association: 'conta',
            attributes: ['id', 'nome', 'tipo'],
          },
          {
            association: 'movimento_pagamento',
            attributes: ['id', 'descricao', 'valor', 'data_competencia', 'data_pagamento', 'pago'],
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
  store = async (req, res) => {
    try {
      const { mes_referencia, ano_referencia, data_fechamento, data_vencimento, cartao_id, conta_id } = req.body;

      // Verificar se o cartão pertence ao usuário
      const cartao = await CartaoCredito.findOne({
        where: { id: cartao_id, user_id: req.userId },
      });

      if (!cartao) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      // Verificar se a conta pertence ao usuário (se fornecida)
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
      }

      const fatura = await Fatura.create({
        mes_referencia,
        ano_referencia,
        data_fechamento,
        data_vencimento,
        cartao_id,
        conta_id: conta_id || null,
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

  // Atualizar fatura (conta padrão, status)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, valor_pago, conta_id } = req.body;

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

      // Verificar se a conta pertence ao usuário (se fornecida)
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }

        fatura.conta_id = conta_id;

        // Atualizar também a conta no movimento de pagamento
        if (fatura.movimento_pagamento_id) {
          const movimento = await Movimento.findByPk(fatura.movimento_pagamento_id);
          if (movimento) {
            movimento.conta_id = conta_id;
            await movimento.save();
          }
        }
      }

      if (status) {
        fatura.status = status;
      }

      if (valor_pago !== undefined) {
        fatura.valor_pago = parseFloat(valor_pago);
      }

      await fatura.save();

      const faturaAtualizada = await Fatura.findByPk(id, {
        include: ['cartao', 'conta', 'movimento_pagamento'],
      });

      return res.json(faturaAtualizada);
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

  // Pagar fatura (total ou parcialmente)
  pagarFatura = async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        valor_pago, 
        data_pagamento, 
        conta_id,
        categoria_id 
      } = req.body;

      console.log(req.body)

      // Validar e parsear valor_pago
      const valorPagoDecimal = parseFloat(valor_pago);

      console.log("Valor Pago", valor_pago)
      if (!valor_pago || isNaN(valorPagoDecimal) || valorPagoDecimal <= 0) {
        return res.status(400).json({ error: 'Valor do pagamento é obrigatório e deve ser um número maior que zero' });
      }

      if (!data_pagamento) {
        return res.status(400).json({ error: 'Data de pagamento é obrigatória' });
      }

      const fatura = await Fatura.findByPk(id, {
        include: ['cartao', 'conta', 'movimento_pagamento'],
      });

      if (!fatura) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      // Verificar se a fatura pertence ao usuário
      if (fatura.cartao.user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Recalcular o valor total da fatura baseado nos movimentos
      const movimentosFatura = await Movimento.findAll({
        where: { 
          fatura_id: id,
          origem: 'cartao'
        },
      });

      const valorTotalCalculado = movimentosFatura.reduce((total, mov) => {
        return total + parseFloat(mov.valor);
      }, 0);

      // Verificar se o valor está diferente e atualizar
      if (parseFloat(fatura.valor_total) !== valorTotalCalculado) {
        console.log(`⚠️ Valor da fatura ${id} estava incorreto. Esperado: ${valorTotalCalculado}, Atual: ${fatura.valor_total}`);
        fatura.valor_total = valorTotalCalculado;
        await fatura.save();
        
        // Recalcular também o limite utilizado do cartão
        const cartao = await CartaoCredito.findByPk(fatura.cartao_id);
        if (cartao) {
          // Buscar todas as faturas do cartão
          const faturasCartao = await Fatura.findAll({
            where: { cartao_id: cartao.id },
          });
          
          const limiteUtilizadoCorreto = faturasCartao.reduce((total, f) => {
            return total + parseFloat(f.valor_total);
          }, 0);
          
          if (parseFloat(cartao.limite_utilizado) !== limiteUtilizadoCorreto) {
            console.log(`⚠️ Limite utilizado do cartão ${cartao.nome} estava incorreto. Esperado: ${limiteUtilizadoCorreto}, Atual: ${cartao.limite_utilizado}`);
            cartao.limite_utilizado = limiteUtilizadoCorreto;
            await cartao.save();
          }
        }
      }

      let contaFinal = conta_id;

      if (!contaFinal) {
        return res.status(400).json({ error: 'É necessário informar uma conta para o pagamento' });
      }

      const valorTotalFatura = parseFloat(fatura.valor_total);
      const valorJaPago = parseFloat(fatura.valor_pago);
      const valorRestante = valorTotalFatura - valorJaPago;

      // Verificar se o valor pago não excede o restante
      if (valorPagoDecimal > valorRestante) {
        return res.status(400).json({ 
          error: 'Valor do pagamento excede o valor restante da fatura',
          valor_restante: valorRestante 
        });
      }

      // Atualizar valor pago da fatura
      fatura.valor_pago = valorJaPago + valorPagoDecimal;

      // Verificar se a fatura foi totalmente paga
      const novoValorPago = parseFloat(fatura.valor_pago);
      if (novoValorPago >= valorTotalFatura) {
        fatura.status = 'paga';
      }

      await fatura.save();

      // Criar movimento de pagamento (sempre cria um novo, permitindo múltiplos pagamentos)
      const movimento = await Movimento.create({
        descricao: `Pagamento Fatura ${fatura.cartao.nome} - ${fatura.mes_referencia.toString().padStart(2, '0')}/${fatura.ano_referencia}`,
        valor: valorPagoDecimal,
        tipo: 'despesa',
        data_competencia: fatura.data_vencimento,
        data_pagamento: data_pagamento,
        pago: true, // Criar como pago
        recorrente: false,
        origem: 'fatura',
        conta_id: contaFinal,
        categoria_id: categoria_id || null,
        fatura_id: id,
        user_id: req.userId,
      });

      // Atualizar a referência do movimento de pagamento principal (último criado)
      fatura.movimento_pagamento_id = movimento.id;
      await fatura.save();

      // Atualizar saldo da conta (debitar o valor do pagamento)
      const conta = await Conta.findByPk(contaFinal);
      if (conta) {
        conta.saldo_atual = parseFloat(conta.saldo_atual) - valorPagoDecimal;
        await conta.save();
      }

      // Liberar limite do cartão (diminuir o limite utilizado)
      const cartao = await CartaoCredito.findByPk(fatura.cartao_id);
      if (cartao) {
        const novoLimiteUtilizado = parseFloat(cartao.limite_utilizado) - valorPagoDecimal;
        cartao.limite_utilizado = Math.max(0, novoLimiteUtilizado);
        await cartao.save();
      }

      // Buscar fatura atualizada com todos os relacionamentos
      const faturaAtualizada = await Fatura.findByPk(id, {
        include: [
          'cartao',
          'conta',
          'movimento_pagamento',
          {
            association: 'movimentos',
            include: ['categoria'],
          },
        ],
      });

      return res.json({
        message: novoValorPago >= valorTotalFatura 
          ? 'Fatura paga com sucesso! Saldo da conta atualizado e limite do cartão liberado.' 
          : 'Pagamento parcial registrado com sucesso. Saldo e limite atualizados.',
        fatura: faturaAtualizada,
        pagamento: {
          valor_pago: valorPagoDecimal,
          valor_restante: valorTotalFatura - novoValorPago,
        },
      });
    } catch (error) {
      console.error('Erro ao pagar fatura:', error);
      return res.status(500).json({ error: 'Erro ao processar pagamento da fatura' });
    }
  }

  // Deletar fatura
  destroy = async (req, res) => {
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

      // Atualizar limite utilizado do cartão
      const cartao = await CartaoCredito.findByPk(fatura.cartao_id);
      if (cartao) {
        cartao.limite_utilizado = parseFloat(cartao.limite_utilizado) - parseFloat(fatura.valor_total);
        await cartao.save();
      }

      // Deletar movimentos associados à fatura
      await Movimento.destroy({
        where: { fatura_id: id },
      });

      // Deletar movimento de pagamento se existir
      if (fatura.movimento_pagamento_id) {
        await Movimento.destroy({
          where: { id: fatura.movimento_pagamento_id },
        });
      }

      await fatura.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar fatura:', error);
      return res.status(500).json({ error: 'Erro ao deletar fatura' });
    }
  };

  // Buscar movimentos da fatura
  getMovimentos = async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se a fatura pertence ao usuário
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

      // Buscar movimentos da fatura (apenas origem cartao)
      const movimentos = await Movimento.findAll({
        where: { 
          fatura_id: id,
          origem: 'cartao'
        },
        include: [
          {
            association: 'categoria',
            attributes: ['id', 'nome', 'cor', 'icone'],
          },
          {
            association: 'conta',
            attributes: ['id', 'nome', 'tipo'],
          },
        ],
        order: [['data_competencia', 'ASC']],
      });

      return res.json(movimentos);
    } catch (error) {
      console.error('Erro ao buscar movimentos da fatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar movimentos da fatura' });
    }
  };

  // Incluir movimento na fatura
  addMovimento = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        descricao,
        valor,
        data_competencia,
        categoria_id,
        observacao,
        parcelado,
        numero_parcela,
        total_parcelas,
      } = req.body;

      // Verificar se a fatura pertence ao usuário
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

      // Validações básicas
      if (!descricao || !valor || !data_competencia) {
        return res.status(400).json({ error: 'Descrição, valor e data de competência são obrigatórios' });
      }

      if (valor <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' });
      }

      // Criar movimento
      const movimento = await Movimento.create({
        descricao,
        valor: parseFloat(valor),
        tipo: 'despesa',
        data_competencia,
        data_pagamento: null,
        observacao: observacao || null,
        pago: false,
        origem: 'cartao',
        recorrente: false,
        parcelado: parcelado || false,
        numero_parcela: numero_parcela || null,
        total_parcelas: total_parcelas || null,
        user_id: req.userId,
        conta_id: null,
        categoria_id: categoria_id || null,
        fatura_id: id,
      });

      // Recalcular valor total da fatura somando todos os movimentos
      const movimentosFatura = await Movimento.findAll({
        where: { 
          fatura_id: id,
          origem: 'cartao'
        },
      });

      const valorTotalFatura = movimentosFatura.reduce((total, mov) => {
        return total + parseFloat(mov.valor);
      }, 0);

      fatura.valor_total = valorTotalFatura;
      await fatura.save();

      // Recalcular limite utilizado do cartão somando todas as faturas
      const cartao = await CartaoCredito.findByPk(fatura.cartao_id);
      if (cartao) {
        const faturasCartao = await Fatura.findAll({
          where: { cartao_id: cartao.id },
        });
        
        const limiteUtilizado = faturasCartao.reduce((total, f) => {
          return total + parseFloat(f.valor_total);
        }, 0);
        
        cartao.limite_utilizado = limiteUtilizado;
        await cartao.save();
      }

      // Retornar movimento criado com relacionamentos
      const movimentoCriado = await Movimento.findByPk(movimento.id, {
        include: [
          {
            association: 'categoria',
            attributes: ['id', 'nome', 'cor', 'icone'],
          },
        ],
      });

      return res.status(201).json(movimentoCriado);
    } catch (error) {
      console.error('Erro ao adicionar movimento na fatura:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao adicionar movimento na fatura' });
    }
  };

  // Atualizar movimento da fatura
  updateMovimento = async (req, res) => {
    try {
      const { id, movimento_id } = req.params;
      const {
        descricao,
        valor,
        data_competencia,
        categoria_id,
        observacao,
        fatura_id
      } = req.body;

      // Verificar se a fatura pertence ao usuário
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

      // Buscar movimento
      const movimento = await Movimento.findOne({
        where: {
          id: movimento_id,
        },
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado nesta fatura' });
      }

      const valorAntigo = parseFloat(movimento.valor);
      let valorNovo = valorAntigo;

      // Atualizar campos
      if (descricao !== undefined) {
        movimento.descricao = descricao;
      }

      if (valor !== undefined) {
        if (valor <= 0) {
          return res.status(400).json({ error: 'Valor deve ser maior que zero' });
        }
        valorNovo = parseFloat(valor);
        movimento.valor = valorNovo;
      }

      if (data_competencia !== undefined) {
        movimento.data_competencia = data_competencia;
      }

      if (categoria_id !== undefined) {
        movimento.categoria_id = categoria_id;
      }

      if (observacao !== undefined) {
        movimento.observacao = observacao;
      }

      // Verificar se o movimento está mudando de fatura
      let mudouFatura = false;
      let faturaAntiga = null;
      let faturaNova = null;

      if (fatura_id !== undefined && fatura_id !== fatura.id) {
        mudouFatura = true;
        faturaAntiga = fatura;

        // Buscar e validar a nova fatura
        faturaNova = await Fatura.findOne({
          where: { id: fatura_id },
          include: [
            {
              association: 'cartao',
              where: { user_id: req.userId },
            },
          ],
        });

        if (!faturaNova) {
          return res.status(404).json({ error: 'Fatura de destino não encontrada' });
        }

        // Atualizar o movimento para a nova fatura
        movimento.fatura_id = fatura_id;
      }

      await movimento.save();

      // Recalcular valor total da(s) fatura(s) afetada(s)
      if (mudouFatura) {
        // FATURA ANTIGA: Recalcular valor total
        const movimentosFaturaAntiga = await Movimento.findAll({
          where: { 
            fatura_id: faturaAntiga.id,
            origem: 'cartao'
          },
        });

        const valorTotalFaturaAntiga = movimentosFaturaAntiga.reduce((total, mov) => {
          return total + parseFloat(mov.valor);
        }, 0);

        faturaAntiga.valor_total = valorTotalFaturaAntiga;
        await faturaAntiga.save();

        // FATURA NOVA: Recalcular valor total
        const movimentosFaturaNova = await Movimento.findAll({
          where: { 
            fatura_id: faturaNova.id,
            origem: 'cartao'
          },
        });

        const valorTotalFaturaNova = movimentosFaturaNova.reduce((total, mov) => {
          return total + parseFloat(mov.valor);
        }, 0);

        faturaNova.valor_total = valorTotalFaturaNova;
        await faturaNova.save();

        // Recalcular limites dos cartões (antiga e nova)
        const cartaoAntigo = await CartaoCredito.findByPk(faturaAntiga.cartao_id);
        if (cartaoAntigo) {
          const faturasCartaoAntigo = await Fatura.findAll({
            where: { cartao_id: cartaoAntigo.id },
          });
          
          const limiteUtilizadoAntigo = faturasCartaoAntigo.reduce((total, f) => {
            return total + parseFloat(f.valor_total);
          }, 0);
          
          cartaoAntigo.limite_utilizado = limiteUtilizadoAntigo;
          await cartaoAntigo.save();
        }

        const cartaoNovo = await CartaoCredito.findByPk(faturaNova.cartao_id);
        if (cartaoNovo) {
          const faturasCartaoNovo = await Fatura.findAll({
            where: { cartao_id: cartaoNovo.id },
          });
          
          const limiteUtilizadoNovo = faturasCartaoNovo.reduce((total, f) => {
            return total + parseFloat(f.valor_total);
          }, 0);
          
          cartaoNovo.limite_utilizado = limiteUtilizadoNovo;
          await cartaoNovo.save();
        }
      } 
      // Se não mudou de fatura, apenas recalcular a fatura atual
      else {
        const movimentosFatura = await Movimento.findAll({
          where: { 
            fatura_id: fatura.id,
            origem: 'cartao'
          },
        });

        const valorTotalFatura = movimentosFatura.reduce((total, mov) => {
          return total + parseFloat(mov.valor);
        }, 0);

        fatura.valor_total = valorTotalFatura;
        await fatura.save();

        // Recalcular limite utilizado do cartão
        const cartao = await CartaoCredito.findByPk(fatura.cartao_id);
        if (cartao) {
          const faturasCartao = await Fatura.findAll({
            where: { cartao_id: cartao.id },
          });
          
          const limiteUtilizado = faturasCartao.reduce((total, f) => {
            return total + parseFloat(f.valor_total);
          }, 0);
          
          cartao.limite_utilizado = limiteUtilizado;
          await cartao.save();
        }
      }

      // Retornar movimento atualizado com relacionamentos
      const movimentoAtualizado = await Movimento.findByPk(movimento_id, {
        include: [
          {
            association: 'categoria',
            attributes: ['id', 'nome', 'cor', 'icone'],
          },
        ],
      });

      return res.json(movimentoAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar movimento da fatura:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar movimento da fatura' });
    }
  };
}

module.exports = new FaturaController();

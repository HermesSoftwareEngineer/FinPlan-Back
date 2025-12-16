const { models } = require('../models');
const { Movimento, Conta, Fatura, CartaoCredito, Sequencia } = models;
const { Op } = require('sequelize');

class MovimentoController {

  // FUNÇÕES AUXILIARES DE RECÁLCULO DE SALDO

  async _recalcularSaldoConta(conta_id, user_id) {
    if (!conta_id) return;

    const conta = await Conta.findOne({ where: { id: conta_id, user_id } });
    if (!conta) return;

    // Busca todos os movimentos pagos da conta que não são de cartão de crédito
    const movimentosPagos = await Movimento.findAll({
      where: {
        conta_id,
        user_id,
        pago: true,
        origem: { [Op.notIn]: ['cartao'] } // Não contar compras de cartão no saldo da conta
      }
    });

    let saldoCalculado = parseFloat(conta.saldo_inicial);

    movimentosPagos.forEach(mov => {
      const valor = parseFloat(mov.valor);
      if (mov.tipo === 'receita') {
        saldoCalculado += valor;
      } else {
        saldoCalculado -= valor;
      }
    });

    conta.saldo_atual = saldoCalculado;
    await conta.save();
  }

  async _recalcularValoresFatura(fatura_id, user_id) {
    if (!fatura_id) return;

    const fatura = await Fatura.findOne({ where: { id: fatura_id }, include: [{ model: CartaoCredito, as: 'cartao' }] });
    if (!fatura || fatura.cartao.user_id !== user_id) return;

    const movimentosDaFatura = await Movimento.findAll({
      where: {
        fatura_id,
        user_id,
        origem: 'cartao'
      }
    });

    const valorTotalCalculado = movimentosDaFatura.reduce((acc, mov) => acc + parseFloat(mov.valor), 0);

    fatura.valor_total = valorTotalCalculado;
    await fatura.save();

    if (fatura.movimento_pagamento_id) {
      const movimentoPagamento = await Movimento.findByPk(fatura.movimento_pagamento_id);
      if (movimentoPagamento) {
        movimentoPagamento.valor = valorTotalCalculado;
        await movimentoPagamento.save();
      }
    }

    return fatura.cartao_id;
  }

  async _recalcularLimiteCartao(cartao_id, user_id) {
    if (!cartao_id) return;

    const cartao = await CartaoCredito.findOne({ where: { id: cartao_id, user_id } });
    if (!cartao) return;

    const faturas = await Fatura.findAll({ where: { cartao_id } });
    if (faturas.length === 0) {
      cartao.limite_utilizado = 0;
      await cartao.save();
      return;
    }

    const faturasIds = faturas.map(f => f.id);

    const movimentosDoCartao = await Movimento.findAll({
      where: {
        fatura_id: { [Op.in]: faturasIds },
        user_id,
        origem: 'cartao'
      }
    });

    const limiteUtilizadoCalculado = movimentosDoCartao.reduce((acc, mov) => acc + parseFloat(mov.valor), 0);

    cartao.limite_utilizado = limiteUtilizadoCalculado;
    await cartao.save();
  }

  // Função auxiliar para gerenciar fatura do cartão (APENAS ENCONTRA OU CRIA)
  async _encontrarOuCriarFatura(cartao_id, data_competencia, user_id) {
    const cartao = await CartaoCredito.findOne({ where: { id: cartao_id, user_id } });
    if (!cartao) throw new Error('Cartão de crédito não encontrado');

    const dataMovimento = new Date(data_competencia + 'T00:00:00Z');
    const diaMovimento = dataMovimento.getUTCDate();
    const mesMovimento = dataMovimento.getUTCMonth();
    const anoMovimento = dataMovimento.getUTCFullYear();

    let mes_referencia, ano_referencia;

    if (diaMovimento > cartao.dia_fechamento) {
      mes_referencia = mesMovimento + 2;
      ano_referencia = anoMovimento;
      if (mes_referencia > 12) {
        mes_referencia = 1;
        ano_referencia += 1;
      }
    } else {
      mes_referencia = mesMovimento + 1;
      ano_referencia = anoMovimento;
    }

    let fatura = await Fatura.findOne({ where: { cartao_id, mes_referencia, ano_referencia } });

    if (!fatura) {
      const dataFechamento = new Date(Date.UTC(ano_referencia, mes_referencia - 1, cartao.dia_fechamento));
      const dataVencimento = new Date(Date.UTC(ano_referencia, mes_referencia - 1, cartao.dia_vencimento));

      fatura = await Fatura.create({
        mes_referencia,
        ano_referencia,
        data_fechamento: dataFechamento.toISOString().split('T')[0],
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        valor_total: 0, // Inicia com 0
        valor_pago: 0,
        status: 'aberta',
        cartao_id,
        conta_id: cartao.conta_id,
      });

      const movimentoPagamento = await Movimento.create({
        descricao: `Pagamento Fatura ${cartao.nome} - ${mes_referencia.toString().padStart(2, '0')}/${ano_referencia}`,
        valor: 0, // Inicia com 0
        tipo: 'despesa',
        data_competencia: fatura.data_vencimento,
        data_pagamento: fatura.data_vencimento,
        pago: false,
        recorrente: false,
        origem: 'fatura',
        conta_id: cartao.conta_id,
        categoria_id: null,
        fatura_id: fatura.id,
        user_id: user_id,
      });

      fatura.movimento_pagamento_id = movimentoPagamento.id;
      await fatura.save();
    }

    return fatura.id;
  }

  // Listar todos os movimentos do usuário
  async index(req, res) {
    try {
      const { tipo, pago, data_inicio, data_fim, conta_id, categoria_id, categorias, incluir_cartao } = req.query;

      const where = { user_id: req.userId };

      if (incluir_cartao !== 'true') {
        where.origem = { [Op.ne]: 'cartao' };
      }
      if (tipo) {
        where.tipo = tipo;
      }
      if (pago !== undefined) {
        where.pago = pago === 'true';
      }
      if (data_inicio && data_fim) {
        where.data_competencia = { [Op.between]: [data_inicio, data_fim] };
      } else if (data_inicio) {
        where.data_competencia = { [Op.gte]: data_inicio };
      } else if (data_fim) {
        where.data_competencia = { [Op.lte]: data_fim };
      }
      if (conta_id) {
        where.conta_id = conta_id;
      }
      if (categorias) {
        const categoriasArray = Array.isArray(categorias)
          ? categorias
          : categorias.split(',').map(id => parseInt(id.trim()));
        where.categoria_id = { [Op.in]: categoriasArray };
      } else if (categoria_id) {
        where.categoria_id = categoria_id;
      }

      const movimentos = await Movimento.findAll({
        where,
        include: [
          { association: 'conta', attributes: ['id', 'nome', 'tipo'] },
          { association: 'categoria', attributes: ['id', 'nome', 'tipo', 'cor', 'icone'] },
          { association: 'fatura', attributes: ['id', 'mes_referencia', 'ano_referencia'], include: ['cartao'] },
        ],
        order: [['data_competencia', 'DESC'], ['created_at', 'DESC']],
      });

      return res.json(movimentos);
    } catch (error) {
      console.error('Erro ao listar movimentos:', error);
      return res.status(500).json({ error: 'Erro ao listar movimentos' });
    }
  }

  // Listar movimentos com saldo diário
  async indexComSaldo(req, res) {
    try {
      const { tipo, data_inicio, data_fim, conta_id, categoria_id, categorias, incluir_cartao } = req.query;

      // 1. CRIAÇÃO DOS FILTROS BASE (SEM DATA)
      const baseWhere = { user_id: req.userId };

      if (incluir_cartao !== 'true') {
        baseWhere.origem = { [Op.ne]: 'cartao' };
      }
      if (tipo) {
        baseWhere.tipo = tipo;
      }
      if (conta_id) {
        baseWhere.conta_id = conta_id;
      }
      if (categorias) {
        const categoriasArray = Array.isArray(categorias)
          ? categorias
          : categorias.split(',').map(id => parseInt(id.trim()));
        baseWhere.categoria_id = { [Op.in]: categoriasArray };
      } else if (categoria_id) {
        baseWhere.categoria_id = categoria_id;
      }

      // 2. BUSCAR SALDO INICIAL DA CONTA E CALCULAR SALDOS GERAIS (REAL E PREVISTO)
      let saldoBaseConta = 0;
      if (conta_id) {
        const conta = await Conta.findOne({ where: { id: conta_id, user_id: req.userId } });
        if (conta) {
          saldoBaseConta = parseFloat(conta.saldo_inicial);
        }
      }

      const todosMovimentos = await Movimento.findAll({ where: baseWhere });

      let saldoFinalRealGeral = saldoBaseConta;
      let saldoFinalPrevistoGeral = saldoBaseConta;

      todosMovimentos.forEach(mov => {
        const valor = parseFloat(mov.valor);
        const multiplicador = mov.tipo === 'receita' ? 1 : -1;
        saldoFinalPrevistoGeral += valor * multiplicador;
        if (mov.pago) {
          saldoFinalRealGeral += valor * multiplicador;
        }
      });

      // 3. CALCULAR SALDO INICIAL PARA O PERÍODO FILTRADO
      let saldoInicialPeriodo = saldoBaseConta;
      if (conta_id && data_inicio) {
        const whereSaldoInicial = {
          user_id: req.userId,
          conta_id: conta_id,
          pago: true,
          origem: { [Op.ne]: 'cartao' },
          data_competencia: { [Op.lt]: data_inicio },
        };
        const movimentosAnteriores = await Movimento.findAll({ where: whereSaldoInicial });

        movimentosAnteriores.forEach(mov => {
          const valor = parseFloat(mov.valor);
          saldoInicialPeriodo += mov.tipo === 'receita' ? valor : -valor;
        });
      }

      // 4. BUSCAR MOVIMENTOS DO PERÍODO E PROCESSAR PARA A RESPOSTA
      const wherePeriodo = { ...baseWhere };
      if (data_inicio && data_fim) {
        wherePeriodo.data_competencia = { [Op.between]: [data_inicio, data_fim] };
      } else if (data_inicio) {
        wherePeriodo.data_competencia = { [Op.gte]: data_inicio };
      } else if (data_fim) {
        wherePeriodo.data_competencia = { [Op.lte]: data_fim };
      }

      const movimentosPeriodo = await Movimento.findAll({
        where: wherePeriodo,
        include: [
          { association: 'conta', attributes: ['id', 'nome', 'tipo', 'saldo_atual'] },
          { association: 'categoria', attributes: ['id', 'nome', 'tipo', 'cor', 'icone'] },
          { association: 'fatura', attributes: ['id', 'mes_referencia', 'ano_referencia'], include: ['cartao'] },
        ],
        order: [['data_competencia', 'ASC'], ['created_at', 'ASC']],
      });

      // 5. AGRUPAR MOVIMENTOS POR DATA E CALCULAR TOTAIS DO PERÍODO
      const movimentosPorData = {};
      let saldoRealAcumulado = saldoInicialPeriodo;
      let saldoPrevistoAcumulado = saldoInicialPeriodo;
      
      let totalReceitasPagas = 0;
      let totalDespesasPagas = 0;
      let totalReceitasPrevistas = 0;
      let totalDespesasPrevistas = 0;

      movimentosPeriodo.forEach(movimento => {
        const data_competencia = movimento.data_competencia;
        const valor = parseFloat(movimento.valor);
        const multiplicador = movimento.tipo === 'receita' ? 1 : -1;

        if (!movimentosPorData[data_competencia]) {
          movimentosPorData[data_competencia] = {
            data: data_competencia,
            movimentos: [],
            saldo_inicial_dia: saldoRealAcumulado,
            saldo_real: saldoRealAcumulado,
            saldo_previsto: saldoPrevistoAcumulado,
            receitas_pagas: 0,
            despesas_pagas: 0,
            receitas_previstas: 0,
            despesas_previstas: 0,
          };
        }

        movimentosPorData[data_competencia].movimentos.push(movimento);

        if (movimento.pago) {
          if (movimento.tipo === 'receita') {
            movimentosPorData[data_competencia].receitas_pagas += valor;
            totalReceitasPagas += valor;
          } else {
            movimentosPorData[data_competencia].despesas_pagas += valor;
            totalDespesasPagas += valor;
          }
          saldoRealAcumulado += valor * multiplicador;
        } else {
          if (movimento.tipo === 'receita') {
            movimentosPorData[data_competencia].receitas_previstas += valor;
            totalReceitasPrevistas += valor;
          } else {
            movimentosPorData[data_competencia].despesas_previstas += valor;
            totalDespesasPrevistas += valor;
          }
        }

        saldoPrevistoAcumulado += valor * multiplicador;

        movimentosPorData[data_competencia].saldo_real = saldoRealAcumulado;
        movimentosPorData[data_competencia].saldo_previsto = saldoPrevistoAcumulado;
      });

      const resultado = Object.values(movimentosPorData).sort((a, b) => new Date(b.data) - new Date(a.data));

      // 6. MONTAR RESPOSTA FINAL
      return res.json({
        saldo_inicial: saldoInicialPeriodo,
        saldo_final_real: saldoFinalRealGeral,
        saldo_final_previsto: saldoFinalPrevistoGeral,
        totais: {
          receitas_pagas: totalReceitasPagas,
          despesas_pagas: totalDespesasPagas,
          receitas_previstas: totalReceitasPrevistas,
          despesas_previstas: totalDespesasPrevistas,
          receitas_total: totalReceitasPagas + totalReceitasPrevistas,
          despesas_total: totalDespesasPagas + totalDespesasPrevistas,
          balanco_pago: totalReceitasPagas - totalDespesasPagas,
          balanco_previsto: (totalReceitasPagas + totalReceitasPrevistas) - (totalDespesasPagas + totalDespesasPrevistas),
        },
        periodo: {
          data_inicio: data_inicio || null,
          data_fim: data_fim || null,
        },
        conta_id: conta_id || null,
        dias: resultado,
      });
    } catch (error) {
      console.error('Erro ao listar movimentos com saldo:', error);
      return res.status(500).json({ error: 'Erro ao listar movimentos com saldo' });
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
  store = async (req, res) => {
    try {
      const {
        descricao,
        valor,
        tipo,
        data_competencia,
        data_pagamento,
        observacao,
        pago,
        recorrente,
        parcelado,
        total_parcelas,
        meses_recorrencia,
        conta_id,
        categoria_id,
        fatura_id,
        cartao_id,
      } = req.body;

      if (conta_id) {
        const conta = await Conta.findOne({ where: { id: conta_id, user_id: req.userId } });
        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
      }

      const movimentosCriados = [];
      let numeroRepeticoes = 1;
      let tipoLancamento = 'unico';

      if (parcelado && total_parcelas) {
        numeroRepeticoes = parseInt(total_parcelas);
        tipoLancamento = 'parcelado';
      } else if (recorrente) {
        numeroRepeticoes = meses_recorrencia ? parseInt(meses_recorrencia) : 48;
        tipoLancamento = 'recorrente';
      }

      let sequencia_id;
      if (tipoLancamento === 'recorrente') {
        const sequencia = await Sequencia.create({ descricao, valor, tipo, data_inicio: data_competencia, ativo: true });
        sequencia_id = sequencia.id;
      }

      for (let i = 0; i < numeroRepeticoes; i++) {
        const dataOriginal = new Date(data_competencia + 'T00:00:00Z');
        const dataCompetenciaParcela = new Date(dataOriginal.setUTCMonth(dataOriginal.getUTCMonth() + i));
        const dataCompetenciaParcelaStr = dataCompetenciaParcela.toISOString().split('T')[0];

        let dataPagamentoFinalParcela = data_pagamento;
        if (data_pagamento) {
          const dataPagOriginal = new Date(data_pagamento + 'T00:00:00Z');
          const dataPagamentoParcela = new Date(dataPagOriginal.setUTCMonth(dataPagOriginal.getUTCMonth() + i));
          dataPagamentoFinalParcela = dataPagamentoParcela.toISOString().split('T')[0];
        }

        let faturaIdParcela = fatura_id;
        let origemParcela = 'manual';

        if (cartao_id) {
          faturaIdParcela = await this._encontrarOuCriarFatura(cartao_id, dataCompetenciaParcelaStr, req.userId);
          origemParcela = 'cartao';
        }

        let descricaoFinal = descricao;
        if (tipoLancamento === 'parcelado') {
          descricaoFinal = `${descricao} - Parcela ${i + 1}/${total_parcelas}`;
        } else if (tipoLancamento === 'recorrente' && i > 0) {
          const dataRef = new Date(dataCompetenciaParcelaStr + 'T00:00:00Z');
          const mesAno = `${(dataRef.getUTCMonth() + 1).toString().padStart(2, '0')}/${dataRef.getUTCFullYear()}`;
          descricaoFinal = `${descricao} (${mesAno})`;
        }

        const dadosMovimento = {
          descricao: descricaoFinal,
          valor,
          tipo,
          data_competencia: dataCompetenciaParcelaStr,
          data_pagamento: dataPagamentoFinalParcela,
          observacao,
          pago: i === 0 ? pago : false,
          recorrente: tipoLancamento === 'recorrente',
          parcelado: tipoLancamento === 'parcelado',
          numero_parcela: tipoLancamento === 'parcelado' ? i + 1 : null,
          total_parcelas: tipoLancamento === 'parcelado' ? total_parcelas : null,
          origem: origemParcela,
          conta_id,
          categoria_id,
          fatura_id: faturaIdParcela,
          user_id: req.userId,
          sequencia_id: tipoLancamento === 'recorrente' ? sequencia_id : null,
          sequencia_numero: tipoLancamento === 'recorrente' ? i + 1 : null,
        };

        const movimento = await Movimento.create(dadosMovimento);
        const movimentoCompleto = await Movimento.findByPk(movimento.id, { include: ['conta', 'categoria', 'fatura'] });
        movimentosCriados.push(movimentoCompleto);
      }

      // Recalcular saldos após todas as criações
      if (conta_id) {
        await this._recalcularSaldoConta(conta_id, req.userId);
      }
      if (cartao_id) {
        const faturasAfetadas = [...new Set(movimentosCriados.map(m => m.fatura_id).filter(id => id))];
        for (const faturaId of faturasAfetadas) {
          await this._recalcularValoresFatura(faturaId, req.userId);
        }
        await this._recalcularLimiteCartao(cartao_id, req.userId);
      }

      if (movimentosCriados.length === 1) {
        return res.status(201).json(movimentosCriados[0]);
      } else {
        return res.status(201).json({ message: `${movimentosCriados.length} lançamentos criados.`, movimentos: movimentosCriados });
      }

    } catch (error) {
      console.error('Erro ao criar movimento:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors.map(e => e.message) });
      }
      return res.status(500).json({ error: 'Erro ao criar movimento' });
    }
  }

  // Atualizar movimento
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { impactar = 'atual', ...dadosUpdate } = req.body;

      const movimentoInicial = await Movimento.findOne({ where: { id, user_id: req.userId }, include: [{ model: Fatura, as: 'fatura', include: ['cartao'] }] });
      if (!movimentoInicial) return res.status(404).json({ error: 'Movimento não encontrado' });
      if (movimentoInicial.origem === 'fatura') return res.status(400).json({ error: 'Pagamentos de fatura não podem ser editados aqui.' });

      const contaIdOriginal = movimentoInicial.conta_id;
      const cartaoIdOriginal = movimentoInicial.fatura ? movimentoInicial.fatura.cartao_id : null;
      const faturaIdOriginal = movimentoInicial.fatura_id;

      const movimentosParaAtualizar = [];
      if (movimentoInicial.sequencia_id && impactar !== 'atual') {
        const whereSequencia = { sequencia_id: movimentoInicial.sequencia_id, user_id: req.userId };
        if (impactar === 'futuros') whereSequencia.sequencia_numero = { [Op.gte]: movimentoInicial.sequencia_numero };
        if (impactar === 'anteriores') whereSequencia.sequencia_numero = { [Op.lte]: movimentoInicial.sequencia_numero };
        const result = await Movimento.findAll({ where: whereSequencia });
        movimentosParaAtualizar.push(...result);
      } else {
        movimentosParaAtualizar.push(movimentoInicial);
      }

      for (const mov of movimentosParaAtualizar) {
        await mov.update(dadosUpdate);
      }

      // Recalcular saldos
      const contasAfetadas = new Set([contaIdOriginal, dadosUpdate.conta_id].filter(id => id));
      const cartoesAfetados = new Set([cartaoIdOriginal, dadosUpdate.cartao_id].filter(id => id));
      const faturasAfetadas = new Set([faturaIdOriginal, dadosUpdate.fatura_id].filter(id => id));

      for (const contaId of contasAfetadas) {
        await this._recalcularSaldoConta(contaId, req.userId);
      }
      for (const faturaId of faturasAfetadas) {
        const cartaoId = await this._recalcularValoresFatura(faturaId, req.userId);
        if (cartaoId) cartoesAfetados.add(cartaoId);
      }
      for (const cartaoId of cartoesAfetados) {
        await this._recalcularLimiteCartao(cartaoId, req.userId);
      }

      const ids = movimentosParaAtualizar.map(m => m.id);
      const movimentosAtualizados = await Movimento.findAll({ where: { id: { [Op.in]: ids } }, include: ['conta', 'categoria', 'fatura'] });

      return res.json({ message: `Movimentos atualizados (${impactar})`, movimentos: movimentosAtualizados });

    } catch (error) {
      console.error('Erro ao atualizar movimento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar movimento' });
    }
  }

  // Deletar movimento
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { impactar = 'atual' } = req.body;

      const movimentoInicial = await Movimento.findOne({ where: { id, user_id: req.userId }, include: [{ model: Fatura, as: 'fatura', include: ['cartao'] }] });
      if (!movimentoInicial) return res.status(404).json({ error: 'Movimento não encontrado' });

      const contaIdAfetada = movimentoInicial.conta_id;
      const cartaoIdAfetado = movimentoInicial.fatura ? movimentoInicial.fatura.cartao_id : null;
      const faturaIdAfetada = movimentoInicial.fatura_id;

      const movimentosParaExcluir = [];
      if (movimentoInicial.sequencia_id && impactar !== 'atual') {
        const whereSequencia = { sequencia_id: movimentoInicial.sequencia_id, user_id: req.userId };
        if (impactar === 'futuros') whereSequencia.sequencia_numero = { [Op.gte]: movimentoInicial.sequencia_numero };
        if (impactar === 'anteriores') whereSequencia.sequencia_numero = { [Op.lte]: movimentoInicial.sequencia_numero };
        const result = await Movimento.findAll({ where: whereSequencia });
        movimentosParaExcluir.push(...result);
      } else {
        movimentosParaExcluir.push(movimentoInicial);
      }

      for (const mov of movimentosParaExcluir) {
        await mov.destroy();
      }

      // Recalcular saldos
      if (contaIdAfetada) {
        await this._recalcularSaldoConta(contaIdAfetada, req.userId);
      }
      if (faturaIdAfetada) {
        await this._recalcularValoresFatura(faturaIdAfetada, req.userId);
      }
      if (cartaoIdAfetado) {
        await this._recalcularLimiteCartao(cartaoIdAfetado, req.userId);
      }

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

      const movimento = await Movimento.findOne({ where: { id, user_id: req.userId } });
      if (!movimento) return res.status(404).json({ error: 'Movimento não encontrado' });

      await movimento.update({ pago: !movimento.pago });

      // Recalcular saldo da conta, se houver
      if (movimento.conta_id) {
        await this._recalcularSaldoConta(movimento.conta_id, req.userId);
      }

      // Se for um pagamento de fatura, o status da fatura e limite do cartão podem mudar
      if (movimento.origem === 'fatura' && movimento.fatura_id) {
        const fatura = await Fatura.findByPk(movimento.fatura_id);
        if (fatura) {
          fatura.valor_pago = movimento.pago ? movimento.valor : 0;
          fatura.status = movimento.pago ? 'paga' : 'fechada';
          await fatura.save();

          // O limite do cartão só é liberado quando a fatura é paga
          await this._recalcularLimiteCartao(fatura.cartao_id, req.userId);
        }
      }

      await movimento.reload();
      return res.json(movimento);
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status de pagamento' });
    }
  }
}

module.exports = new MovimentoController();

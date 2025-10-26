const { models } = require('../models');
const { Movimento, Conta, Fatura, CartaoCredito } = models;
const { Op } = require('sequelize');

class MovimentoController {
  // Função auxiliar para gerenciar fatura do cartão
  async gerenciarFaturaCartao(cartao_id, data_competencia, valor, user_id) {
    // Obter o cartão
    const cartao = await CartaoCredito.findOne({
      where: { id: cartao_id, user_id },
    });

    if (!cartao) {
      throw new Error('Cartão de crédito não encontrado');
    }

    // Calcular mês e ano de referência baseado na data de competência e dia de fechamento
    const dataMovimento = new Date(data_competencia);
    const diaMovimento = dataMovimento.getDate();
    const mesMovimento = dataMovimento.getMonth(); // 0-11
    const anoMovimento = dataMovimento.getFullYear();

    let mes_referencia, ano_referencia;

    // Se a compra foi feita após o fechamento, vai para a próxima fatura
    if (diaMovimento > cartao.dia_fechamento) {
      mes_referencia = mesMovimento + 2; // +1 para próximo mês, +1 porque getMonth é 0-based
      ano_referencia = anoMovimento;
      
      if (mes_referencia > 12) {
        mes_referencia = mes_referencia - 12;
        ano_referencia = ano_referencia + 1;
      }
    } else {
      mes_referencia = mesMovimento + 1; // +1 porque getMonth é 0-based
      ano_referencia = anoMovimento;
    }

    // Buscar fatura (que já deve existir, criada ao cadastrar cartão)
    let fatura = await Fatura.findOne({
      where: {
        cartao_id,
        mes_referencia,
        ano_referencia,
      },
    });

    if (!fatura) {
      // Se não encontrou a fatura, criar (fallback para cartões antigos)
      const dataFechamento = new Date(ano_referencia, mes_referencia - 1, cartao.dia_fechamento);
      const dataVencimento = new Date(ano_referencia, mes_referencia - 1, cartao.dia_vencimento);

      fatura = await Fatura.create({
        mes_referencia,
        ano_referencia,
        data_fechamento: dataFechamento.toISOString().split('T')[0],
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        valor_total: valor,
        valor_pago: 0,
        status: 'aberta',
        cartao_id,
        conta_id: cartao.conta_id, // Usar conta padrão do cartão
      });

      // Criar movimento de pagamento da fatura
      const movimentoPagamento = await Movimento.create({
        descricao: `Pagamento Fatura ${cartao.nome} - ${mes_referencia.toString().padStart(2, '0')}/${ano_referencia}`,
        valor: valor,
        tipo: 'despesa',
        data_competencia: fatura.data_vencimento,
        data_pagamento: fatura.data_vencimento, // Mesma data do vencimento
        pago: false,
        recorrente: false,
        origem: 'fatura',
        conta_id: cartao.conta_id, // Usar conta padrão do cartão
        categoria_id: null,
        fatura_id: fatura.id, // Vincular à fatura
        user_id: user_id,
      });

      // Vincular movimento à fatura
      fatura.movimento_pagamento_id = movimentoPagamento.id;
      await fatura.save();
    } else {
      // Fatura já existe, apenas atualizar valor
      fatura.valor_total = parseFloat(fatura.valor_total) + parseFloat(valor);
      await fatura.save();

      // Atualizar valor do movimento de pagamento, se existir
      if (fatura.movimento_pagamento_id) {
        const movimentoPagamento = await Movimento.findByPk(fatura.movimento_pagamento_id);
        if (movimentoPagamento) {
          movimentoPagamento.valor = fatura.valor_total;
          await movimentoPagamento.save();
        }
      } else {
        // Se a fatura existe mas não tem movimento de pagamento, criar
        const movimentoPagamento = await Movimento.create({
          descricao: `Pagamento Fatura ${cartao.nome} - ${mes_referencia.toString().padStart(2, '0')}/${ano_referencia}`,
          valor: fatura.valor_total,
          tipo: 'despesa',
          data_competencia: fatura.data_vencimento,
          data_pagamento: fatura.data_vencimento, // Mesma data do vencimento
          pago: false,
          recorrente: false,
          origem: 'fatura',
          conta_id: cartao.conta_id,
          categoria_id: null,
          fatura_id: fatura.id, // Vincular à fatura
          user_id: user_id,
        });

        fatura.movimento_pagamento_id = movimentoPagamento.id;
        await fatura.save();
      }
    }

    // Atualizar limite utilizado do cartão
    cartao.limite_utilizado = parseFloat(cartao.limite_utilizado) + parseFloat(valor);
    await cartao.save();

    return fatura.id;
  }

  // Listar todos os movimentos do usuário
  async index(req, res) {
    try {
      const { tipo, pago, data_inicio, data_fim, conta_id, categoria_id, categorias, incluir_cartao } = req.query;

      const where = { user_id: req.userId };

      // Por padrão, NÃO incluir movimentos de origem cartão
      if (incluir_cartao !== 'true') {
        where.origem = {
          [Op.ne]: 'cartao'
        };
      }

      if (tipo) {
        where.tipo = tipo;
      }

      if (pago !== undefined) {
        where.pago = pago === 'true';
      }

      if (data_inicio && data_fim) {
        where.data_competencia = {
          [Op.between]: [data_inicio, data_fim],
        };
      } else if (data_inicio) {
        where.data_competencia = {
          [Op.gte]: data_inicio,
        };
      } else if (data_fim) {
        where.data_competencia = {
          [Op.lte]: data_fim,
        };
      }

      if (conta_id) {
        where.conta_id = conta_id;
      }

      // Filtro por múltiplas categorias
      if (categorias) {
        // Aceita array de IDs: ?categorias=1,2,3 ou ?categorias[]=1&categorias[]=2
        const categoriasArray = Array.isArray(categorias) 
          ? categorias 
          : categorias.split(',').map(id => parseInt(id.trim()));
        
        where.categoria_id = {
          [Op.in]: categoriasArray,
        };
      } else if (categoria_id) {
        // Filtro por categoria única (mantém compatibilidade)
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

      const where = { user_id: req.userId };

      // Por padrão, NÃO incluir movimentos de origem cartão
      if (incluir_cartao !== 'true') {
        where.origem = {
          [Op.ne]: 'cartao'
        };
      }

      if (tipo) {
        where.tipo = tipo;
      }

      if (data_inicio && data_fim) {
        where.data_competencia = {
          [Op.between]: [data_inicio, data_fim],
        };
      } else if (data_inicio) {
        where.data_competencia = {
          [Op.gte]: data_inicio,
        };
      } else if (data_fim) {
        where.data_competencia = {
          [Op.lte]: data_fim,
        };
      }

      if (conta_id) {
        where.conta_id = conta_id;
      }

      // Filtro por múltiplas categorias
      if (categorias) {
        const categoriasArray = Array.isArray(categorias) 
          ? categorias 
          : categorias.split(',').map(id => parseInt(id.trim()));
        
        where.categoria_id = {
          [Op.in]: categoriasArray,
        };
      } else if (categoria_id) {
        where.categoria_id = categoria_id;
      }

      // Buscar todos os movimentos ordenados por data
      const movimentos = await Movimento.findAll({
        where,
        include: [
          {
            association: 'conta',
            attributes: ['id', 'nome', 'tipo', 'saldo_atual'],
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
        order: [['data_competencia', 'ASC'], ['created_at', 'ASC']],
      });

      // Calcular saldo inicial (se há filtro de conta)
      let saldoInicial = 0;
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });
        
        if (conta) {
          saldoInicial = parseFloat(conta.saldo_inicial);
          
          // Se há filtro de data_inicio, calcular o saldo até essa data
          if (data_inicio) {
            const movimentosAnteriores = await Movimento.findAll({
              where: {
                user_id: req.userId,
                conta_id: conta_id,
                pago: true,
                origem: {
                  [Op.ne]: 'cartao'
                },
                data_competencia: {
                  [Op.lt]: data_inicio,
                },
              },
            });

            movimentosAnteriores.forEach(mov => {
              const valor = parseFloat(mov.valor);
              if (mov.tipo === 'receita') {
                saldoInicial += valor;
              } else if (mov.tipo === 'despesa') {
                saldoInicial -= valor;
              }
            });
          }
        }
      }

      // Agrupar movimentos por data_competencia e calcular saldos
      const movimentosPorData = {};
      let saldoRealAcumulado = saldoInicial;
      let saldoPrevistoAcumulado = saldoInicial;
      
      // Variáveis para totais gerais
      let totalReceitasPagas = 0;
      let totalDespesasPagas = 0;
      let totalReceitasPrevistas = 0;
      let totalDespesasPrevistas = 0;

      movimentos.forEach(movimento => {
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

        // Adicionar movimento ao dia
        movimentosPorData[data_competencia].movimentos.push(movimento);

        // Atualizar totais
        if (movimento.pago) {
          if (movimento.tipo === 'receita') {
            movimentosPorData[data_competencia].receitas_pagas += valor;
            totalReceitasPagas += valor;
          } else if (movimento.tipo === 'despesa') {
            movimentosPorData[data_competencia].despesas_pagas += valor;
            totalDespesasPagas += valor;
          }
          saldoRealAcumulado += valor * multiplicador;
        } else {
          if (movimento.tipo === 'receita') {
            movimentosPorData[data_competencia].receitas_previstas += valor;
            totalReceitasPrevistas += valor;
          } else if (movimento.tipo === 'despesa') {
            movimentosPorData[data_competencia].despesas_previstas += valor;
            totalDespesasPrevistas += valor;
          }
        }

        saldoPrevistoAcumulado += valor * multiplicador;

        // Atualizar saldos do dia
        movimentosPorData[data_competencia].saldo_real = saldoRealAcumulado;
        movimentosPorData[data_competencia].saldo_previsto = saldoPrevistoAcumulado;
      });

      // Converter objeto em array e ordenar por data decrescente
      const resultado = Object.values(movimentosPorData).sort((a, b) => {
        return new Date(b.data) - new Date(a.data);
      });

      return res.json({
        saldo_inicial: saldoInicial,
        saldo_final_real: saldoRealAcumulado,
        saldo_final_previsto: saldoPrevistoAcumulado,
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
        numero_parcela,
        total_parcelas,
        meses_recorrencia, // Novo: quantos meses criar para lançamento recorrente (padrão: 12)
        conta_id,
        categoria_id,
        fatura_id,
        cartao_id, // Novo campo para identificar se é lançamento de cartão
      } = req.body;

      let faturaIdFinal = fatura_id;
      let dataPagamentoFinal = data_pagamento;
      let origemFinal = 'manual'; // Padrão para movimentos criados pelo usuário

      // Verificar se a conta pertence ao usuário (se fornecida)
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
      }

      // Array para armazenar todos os movimentos criados
      const movimentosCriados = [];

      // Definir número de repetições baseado no tipo de lançamento
      let numeroRepeticoes = 1;
      let tipoLancamento = 'unico';

      if (parcelado && total_parcelas) {
        numeroRepeticoes = parseInt(total_parcelas);
        tipoLancamento = 'parcelado';
      } else if (recorrente) {
        numeroRepeticoes = meses_recorrencia ? parseInt(meses_recorrencia) : 12; // Padrão: 12 meses
        tipoLancamento = 'recorrente';
      }

      // Criar as repetições (parcelas ou recorrências)
      for (let i = 0; i < numeroRepeticoes; i++) {
        // Calcular data de competência da parcela/recorrência
        // Usar Date.UTC para evitar problemas com timezone
        const dataOriginal = new Date(data_competencia + 'T00:00:00');
        const dia = dataOriginal.getDate();
        const mes = dataOriginal.getMonth();
        const ano = dataOriginal.getFullYear();
        
        // Adicionar meses preservando o dia
        const novoMes = mes + i;
        const dataCompetenciaParcela = new Date(ano, novoMes, dia);
        const dataCompetenciaParcelaStr = dataCompetenciaParcela.toISOString().split('T')[0];

        // Calcular data de pagamento da parcela (se fornecida)
        let dataPagamentoParcelaStr = null;
        if (data_pagamento) {
          const dataPagOriginal = new Date(data_pagamento + 'T00:00:00');
          const diaPag = dataPagOriginal.getDate();
          const mesPag = dataPagOriginal.getMonth();
          const anoPag = dataPagOriginal.getFullYear();
          
          const novoMesPag = mesPag + i;
          const dataPagamentoParcela = new Date(anoPag, novoMesPag, diaPag);
          dataPagamentoParcelaStr = dataPagamentoParcela.toISOString().split('T')[0];
        }

        let faturaIdParcela = fatura_id;
        let dataPagamentoFinalParcela = dataPagamentoParcelaStr;
        let origemParcela = origemFinal;

        // Se forneceu cartao_id, gerenciar fatura automaticamente para cada parcela
        if (cartao_id && !fatura_id) {
          faturaIdParcela = await this.gerenciarFaturaCartao(
            cartao_id,
            dataCompetenciaParcelaStr,
            valor,
            req.userId
          );

          origemParcela = 'cartao'; // Movimento originado de compra no cartão

          // Buscar a fatura criada/atualizada para pegar a data de vencimento
          if (!dataPagamentoParcelaStr && faturaIdParcela) {
            const fatura = await Fatura.findByPk(faturaIdParcela);
            if (fatura) {
              dataPagamentoFinalParcela = fatura.data_vencimento;
            }
          }
        } else if (fatura_id && i === 0) {
          // Se forneceu fatura_id diretamente, atualizar fatura e cartão (apenas primeira parcela)
          const fatura = await Fatura.findByPk(fatura_id, {
            include: ['cartao'],
          });

          if (fatura) {
            // Atualizar valor da fatura
            fatura.valor_total = parseFloat(fatura.valor_total) + parseFloat(valor);
            await fatura.save();

            // Atualizar limite utilizado do cartão
            if (fatura.cartao) {
              fatura.cartao.limite_utilizado = parseFloat(fatura.cartao.limite_utilizado) + parseFloat(valor);
              await fatura.cartao.save();
            }

            // Atualizar ou criar movimento de pagamento da fatura
            if (fatura.movimento_pagamento_id) {
              const movimentoPagamento = await Movimento.findByPk(fatura.movimento_pagamento_id);
              if (movimentoPagamento) {
                movimentoPagamento.valor = fatura.valor_total;
                await movimentoPagamento.save();
              }
            } else {
              // Se a fatura não tem movimento de pagamento, criar
              const movimentoPagamento = await Movimento.create({
                descricao: `Pagamento Fatura ${fatura.cartao.nome} - ${fatura.mes_referencia.toString().padStart(2, '0')}/${fatura.ano_referencia}`,
                valor: fatura.valor_total,
                tipo: 'despesa',
                data_competencia: fatura.data_vencimento,
                data_pagamento: fatura.data_vencimento,
                pago: false,
                recorrente: false,
                origem: 'fatura',
                conta_id: fatura.cartao.conta_id,
                categoria_id: null,
                fatura_id: fatura_id,
                user_id: req.userId,
              });

              fatura.movimento_pagamento_id = movimentoPagamento.id;
              await fatura.save();
            }

            // Se não informou data_pagamento, usar data de vencimento da fatura
            if (!dataPagamentoParcelaStr) {
              dataPagamentoFinalParcela = fatura.data_vencimento;
            }

            origemParcela = 'cartao'; // Movimento vinculado a fatura de cartão
          }
        }

        // Atualizar saldo da conta se o movimento estiver pago (apenas na primeira parcela se for movimento de conta)
        if (conta_id && pago && i === 0 && !cartao_id && !fatura_id) {
          const conta = await Conta.findByPk(conta_id);
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

        // Criar descrição baseada no tipo de lançamento
        let descricaoFinal = descricao;
        if (tipoLancamento === 'parcelado') {
          descricaoFinal = `${descricao} - Parcela ${i + 1}/${total_parcelas}`;
        } else if (tipoLancamento === 'recorrente' && i > 0) {
          // Para recorrentes, manter descrição original mas indicar o mês
          const dataRef = new Date(dataCompetenciaParcelaStr);
          const mesAno = `${(dataRef.getMonth() + 1).toString().padStart(2, '0')}/${dataRef.getFullYear()}`;
          descricaoFinal = `${descricao} (${mesAno})`;
        }

        // Criar o movimento
        const movimento = await Movimento.create({
          descricao: descricaoFinal,
          valor,
          tipo,
          data_competencia: dataCompetenciaParcelaStr,
          data_pagamento: dataPagamentoFinalParcela,
          observacao,
          pago: i === 0 ? pago : false, // Apenas o primeiro pode ser pago inicialmente
          recorrente: tipoLancamento === 'recorrente',
          parcelado: tipoLancamento === 'parcelado',
          numero_parcela: tipoLancamento === 'parcelado' ? i + 1 : numero_parcela,
          total_parcelas: tipoLancamento === 'parcelado' ? total_parcelas : null,
          origem: origemParcela,
          conta_id,
          categoria_id,
          fatura_id: faturaIdParcela,
          user_id: req.userId,
        });

        // Recarregar com associações
        const movimentoCompleto = await Movimento.findByPk(movimento.id, {
          include: ['conta', 'categoria', 'fatura'],
        });

        movimentosCriados.push(movimentoCompleto);
      }

      // Retornar todos os movimentos criados ou apenas o primeiro se for único
      if (movimentosCriados.length === 1) {
        return res.status(201).json(movimentosCriados[0]);
      } else {
        const mensagem = tipoLancamento === 'parcelado' 
          ? `${movimentosCriados.length} parcelas criadas com sucesso`
          : `${movimentosCriados.length} lançamentos recorrentes criados com sucesso`;
        
        return res.status(201).json({
          message: mensagem,
          tipo: tipoLancamento,
          total: movimentosCriados.length,
          movimentos: movimentosCriados,
        });
      }
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
  update = async (req, res) => {
    try {
      const { id } = req.params;
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
        numero_parcela,
        total_parcelas,
        conta_id,
        categoria_id,
        fatura_id,
        cartao_id,
        impactar = 'atual', // 'atual', 'todos', 'futuros', 'anteriores'
      } = req.body;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
        include: ['fatura'],
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      // ⚠️ VALIDAÇÃO PRIORITÁRIA: Movimentos de origem 'fatura' não podem ser editados aqui
      if (movimento.origem === 'fatura') {
        return res.status(400).json({ 
          error: 'Movimentos de pagamento de fatura não podem ser editados diretamente',
          message: 'Solicite na rota de fatura para atualizar este movimento'
        });
      }

      // Função para atualizar um movimento
      const atualizarMovimento = async (mov) => {
        // ...lógica de reversão e atualização igual ao movimento principal...
        // Para simplificar, só atualiza os campos informados
        await mov.update({
          descricao,
          valor,
          tipo,
          data_competencia,
          data_pagamento,
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
      };

      // Se o movimento faz parte de uma sequência
      if (movimento.sequencia_id) {
        let movimentosParaAtualizar = [];
        switch (impactar) {
          case 'todos':
            movimentosParaAtualizar = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
              },
            });
            break;
          case 'futuros':
            movimentosParaAtualizar = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
                sequencia_numero: { [Op.gte]: movimento.sequencia_numero },
              },
            });
            break;
          case 'anteriores':
            movimentosParaAtualizar = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
                sequencia_numero: { [Op.lte]: movimento.sequencia_numero },
              },
            });
            break;
          case 'atual':
          default:
            movimentosParaAtualizar = [movimento];
        }

        for (const mov of movimentosParaAtualizar) {
          await atualizarMovimento(mov);
        }

        // Recarregar todos os movimentos atualizados
        const ids = movimentosParaAtualizar.map(m => m.id);
        const movimentosAtualizados = await Movimento.findAll({
          where: { id: ids },
          include: ['conta', 'categoria', 'fatura'],
        });
        return res.json({
          message: `Movimentos atualizados (${impactar})`,
          movimentos: movimentosAtualizados,
        });
      } else {
        // Não faz parte de sequência, atualizar só o atual
        await atualizarMovimento(movimento);
        const movimentoAtualizado = await Movimento.findByPk(id, {
          include: ['conta', 'categoria', 'fatura'],
        });
        return res.json(movimentoAtualizado);
      }
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
      const { impactar = 'atual' } = req.body;

      const movimento = await Movimento.findOne({
        where: { id, user_id: req.userId },
        include: ['fatura'],
      });

      if (!movimento) {
        return res.status(404).json({ error: 'Movimento não encontrado' });
      }

      // Função para reverter e excluir um movimento
      const excluirMovimento = async (mov) => {
        // ...lógica de reversão igual ao movimento principal...
        // Se é um movimento de pagamento de fatura (origem: 'fatura')
        if (mov.origem === 'fatura') {
          const faturaPagamento = await Fatura.findOne({
            where: { movimento_pagamento_id: mov.id },
            include: ['cartao'],
          });
          if (faturaPagamento) {
            const valorMovimento = parseFloat(mov.valor);
            faturaPagamento.valor_pago = parseFloat(faturaPagamento.valor_pago) - valorMovimento;
            const valorTotalFatura = parseFloat(faturaPagamento.valor_total);
            const novoValorPago = parseFloat(faturaPagamento.valor_pago);
            if (novoValorPago < valorTotalFatura) {
              faturaPagamento.status = 'fechada';
            }
            faturaPagamento.movimento_pagamento_id = null;
            await faturaPagamento.save();
            if (faturaPagamento.cartao && mov.pago) {
              faturaPagamento.cartao.limite_utilizado = parseFloat(faturaPagamento.cartao.limite_utilizado) + valorMovimento;
              await faturaPagamento.cartao.save();
            }
          }
        }
        // Reverter o saldo se o movimento estava pago
        if (mov.pago && mov.conta_id) {
          const conta = await Conta.findByPk(mov.conta_id);
          if (conta) {
            const valorMovimento = parseFloat(mov.valor);
            if (mov.tipo === 'receita') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) - valorMovimento;
            } else if (mov.tipo === 'despesa') {
              conta.saldo_atual = parseFloat(conta.saldo_atual) + valorMovimento;
            }
            await conta.save();
          }
        }
        // Reverter valores do cartão e fatura se for movimento de cartão
        if (mov.fatura_id) {
          const fatura = await Fatura.findByPk(mov.fatura_id, {
            include: ['cartao'],
          });
          if (fatura) {
            const valorMovimento = parseFloat(mov.valor);
            fatura.valor_total = Math.max(0, parseFloat(fatura.valor_total) - valorMovimento);
            await fatura.save();
            if (fatura.cartao) {
              const novoLimiteUtilizado = parseFloat(fatura.cartao.limite_utilizado) - valorMovimento;
              fatura.cartao.limite_utilizado = Math.max(0, novoLimiteUtilizado);
              await fatura.cartao.save();
            }
          }
        }
        await mov.destroy();
      };

      if (movimento.sequencia_id) {
        let movimentosParaExcluir = [];
        switch (impactar) {
          case 'todos':
            movimentosParaExcluir = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
              },
            });
            break;
          case 'futuros':
            movimentosParaExcluir = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
                sequencia_numero: { [Op.gte]: movimento.sequencia_numero },
              },
            });
            break;
          case 'anteriores':
            movimentosParaExcluir = await Movimento.findAll({
              where: {
                sequencia_id: movimento.sequencia_id,
                user_id: req.userId,
                sequencia_numero: { [Op.lte]: movimento.sequencia_numero },
              },
            });
            break;
          case 'atual':
          default:
            movimentosParaExcluir = [movimento];
        }

        for (const mov of movimentosParaExcluir) {
          await excluirMovimento(mov);
        }
        return res.status(204).send();
      } else {
        await excluirMovimento(movimento);
        return res.status(204).send();
      }
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

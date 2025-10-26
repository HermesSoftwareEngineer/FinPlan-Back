const { models } = require('../models');
const { Movimento, Categoria, GrupoCategoria, User } = models;
const { Op } = require('sequelize');

class DreController {
  // GET /dre - Demonstrativo de Resultados do Exercício
  index = async (req, res) => {
    try {
      const {
        data_inicio,
        data_fim,
        modo = 'competencia', // 'competencia' ou 'caixa'
        user_ids, // IDs de usuários separados por vírgula para consolidação
      } = req.query;

      // Validações
      if (!data_inicio || !data_fim) {
        return res.status(400).json({
          error: 'Parâmetros data_inicio e data_fim são obrigatórios',
        });
      }

      if (!['competencia', 'caixa'].includes(modo)) {
        return res.status(400).json({
          error: 'Modo deve ser "competencia" ou "caixa"',
        });
      }

      // Definir usuários a serem incluídos na consulta
      let userIdsArray = [req.userId]; // Por padrão, apenas o usuário logado

      // Se user_ids foi fornecido, permitir consolidação (pode ser usado para famílias/empresas)
      if (user_ids) {
        const requestedIds = user_ids.split(',').map(id => parseInt(id));
        
        // Verificar se o usuário logado está na lista (segurança)
        if (!requestedIds.includes(req.userId)) {
          return res.status(403).json({
            error: 'Você não pode visualizar DRE de outros usuários sem incluir o seu',
          });
        }
        
        userIdsArray = requestedIds;
      }

      // Definir campo de data baseado no modo
      const campoData = modo === 'competencia' ? 'data_competencia' : 'data_pagamento';

      // Buscar movimentos no período
      const whereMovimento = {
        user_id: { [Op.in]: userIdsArray },
        [campoData]: {
          [Op.between]: [data_inicio, data_fim],
        },
      };

      // Se modo é 'caixa', considerar apenas movimentos pagos
      if (modo === 'caixa') {
        whereMovimento.pago = true;
      }

      const movimentos = await Movimento.findAll({
        where: whereMovimento,
        include: [
          {
            association: 'categoria',
            attributes: ['id', 'nome', 'tipo', 'cor', 'icone'],
            include: [
              {
                association: 'grupo',
                attributes: ['id', 'nome', 'cor', 'icone'],
              },
            ],
          },
          {
            association: 'usuario',
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [[campoData, 'ASC']],
      });

      // Gerar todos os meses do período
      const dataInicio = new Date(data_inicio);
      const dataFim = new Date(data_fim);
      const todosMeses = [];
      
      let dataAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
      const dataFimMes = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
      
      while (dataAtual <= dataFimMes) {
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        todosMeses.push(`${ano}-${mes}`);
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }

      // Estrutura para armazenar dados por categoria/grupo e mês
      const linhasReceitas = {}; // { categoriaId: { nome, grupo, meses: { '2025-01': valor } } }
      const linhasDespesas = {};
      const totaisPorMes = {}; // { '2025-01': { receitas, despesas, resultado } }

      // Inicializar todos os meses com valor zero
      todosMeses.forEach((mes) => {
        totaisPorMes[mes] = {
          receitas: 0,
          despesas: 0,
          resultado: 0,
        };
      });

      let totalReceitas = 0;
      let totalDespesas = 0;
      let movimentosSemCategoria = 0;

      // Processar cada movimento
      movimentos.forEach((movimento) => {
        const valor = parseFloat(movimento.valor);
        const tipo = movimento.tipo;
        const data = movimento[campoData];
        const mesAno = data.substring(0, 7); // '2025-01'

        const categoria = movimento.categoria;

        // Movimentos sem categoria
        if (!categoria) {
          movimentosSemCategoria++;
          if (tipo === 'receita') {
            totaisPorMes[mesAno].receitas += valor;
            totalReceitas += valor;
          } else if (tipo === 'despesa') {
            totaisPorMes[mesAno].despesas += valor;
            totalDespesas += valor;
          }
          return;
        }

        const grupo = categoria.grupo;
        const tipoFinal = categoria.tipo || tipo;

        if (tipoFinal === 'receita') {
          const categoriaId = categoria.id;
          
          // Inicializar linha da categoria se não existir
          if (!linhasReceitas[categoriaId]) {
            linhasReceitas[categoriaId] = {
              tipo: 'categoria',
              id: categoriaId,
              nome: categoria.nome,
              grupo_id: grupo ? grupo.id : null,
              grupo_nome: grupo ? grupo.nome : 'Sem Grupo',
              cor: categoria.cor,
              icone: categoria.icone, 
              meses: {},
              total: 0,
            };
          }

          // Inicializar valor do mês se não existir
          if (!linhasReceitas[categoriaId].meses[mesAno]) {
            linhasReceitas[categoriaId].meses[mesAno] = 0;
          }

          linhasReceitas[categoriaId].meses[mesAno] += valor;
          linhasReceitas[categoriaId].total += valor;
          totaisPorMes[mesAno].receitas += valor;
          totalReceitas += valor;

        } else if (tipoFinal === 'despesa') {
          const categoriaId = categoria.id;
          
          // Inicializar linha da categoria se não existir
          if (!linhasDespesas[categoriaId]) {
            linhasDespesas[categoriaId] = {
              tipo: 'categoria',
              id: categoriaId,
              nome: categoria.nome,
              grupo_id: grupo ? grupo.id : null,
              grupo_nome: grupo ? grupo.nome : 'Sem Grupo',
              cor: categoria.cor,
              icone: categoria.icone,
              meses: {},
              total: 0,
            };
          }

          // Inicializar valor do mês se não existir
          if (!linhasDespesas[categoriaId].meses[mesAno]) {
            linhasDespesas[categoriaId].meses[mesAno] = 0;
          }

          linhasDespesas[categoriaId].meses[mesAno] += valor;
          linhasDespesas[categoriaId].total += valor;
          totaisPorMes[mesAno].despesas += valor;
          totalDespesas += valor;
        }
      });

      // Calcular resultado por mês
      todosMeses.forEach((mes) => {
        totaisPorMes[mes].resultado = totaisPorMes[mes].receitas - totaisPorMes[mes].despesas;
      });

      // Usar todos os meses do período
      const mesesOrdenados = todosMeses;
      const quantidadeMeses = mesesOrdenados.length;

      // Calcular médias
      const mediaReceitas = quantidadeMeses > 0 ? totalReceitas / quantidadeMeses : 0;
      const mediaDespesas = quantidadeMeses > 0 ? totalDespesas / quantidadeMeses : 0;
      const mediaResultado = mediaReceitas - mediaDespesas;

      // Organizar linhas de receitas por grupo
      const linhasReceitasAgrupadas = agruparLinhasPorGrupo(Object.values(linhasReceitas), mesesOrdenados);
      
      // Organizar linhas de despesas por grupo
      const linhasDespesasAgrupadas = agruparLinhasPorGrupo(Object.values(linhasDespesas), mesesOrdenados);

      // Montar resposta final
      const resultado = {
        periodo: {
          data_inicio,
          data_fim,
          modo,
        },
        usuarios: userIdsArray.length > 1 ? userIdsArray : [req.userId],
        consolidado: userIdsArray.length > 1,
        
        // Array de meses (colunas da tabela)
        meses: mesesOrdenados,
        
        // Linhas da tabela de receitas
        receitas: {
          linhas: linhasReceitasAgrupadas,
          totais: {
            label: 'TOTAL RECEITAS',
            meses: mesesOrdenados.reduce((acc, mes) => {
              acc[mes] = totaisPorMes[mes]?.receitas || 0;
              return acc;
            }, {}),
            total: totalReceitas,
            media: mediaReceitas,
          },
        },
        
        // Linhas da tabela de despesas
        despesas: {
          linhas: linhasDespesasAgrupadas,
          totais: {
            label: 'TOTAL DESPESAS',
            meses: mesesOrdenados.reduce((acc, mes) => {
              acc[mes] = totaisPorMes[mes]?.despesas || 0;
              return acc;
            }, {}),
            total: totalDespesas,
            media: mediaDespesas,
          },
        },
        
        // Linha de resultado líquido
        resultado_liquido: {
          label: 'RESULTADO LÍQUIDO',
          meses: mesesOrdenados.reduce((acc, mes) => {
            acc[mes] = totaisPorMes[mes]?.resultado || 0;
            return acc;
          }, {}),
          total: totalReceitas - totalDespesas,
          media: mediaResultado,
        },
        
        // Estatísticas gerais
        estatisticas: {
          total_receitas: totalReceitas,
          total_despesas: totalDespesas,
          resultado_liquido: totalReceitas - totalDespesas,
          media_receitas_mensal: mediaReceitas,
          media_despesas_mensal: mediaDespesas,
          media_resultado_mensal: mediaResultado,
          quantidade_meses: quantidadeMeses,
          total_movimentos: movimentos.length,
          movimentos_sem_categoria: movimentosSemCategoria,
        },
      };

      return res.json(resultado);
    } catch (error) {
      console.error('Erro ao gerar DRE:', error);
      return res.status(500).json({ error: 'Erro ao gerar DRE' });
    }
  };
}

// Função auxiliar para agrupar linhas por grupo
function agruparLinhasPorGrupo(linhas, mesesOrdenados) {
  const grupos = {};
  
  // Agrupar categorias por grupo
  linhas.forEach((linha) => {
    const grupoNome = linha.grupo_nome;
    
    if (!grupos[grupoNome]) {
      grupos[grupoNome] = {
        tipo: 'grupo',
        nome: grupoNome,
        categorias: [],
        totais: {
          meses: {},
          total: 0,
        },
      };
      
      // Inicializar meses do grupo
      mesesOrdenados.forEach((mes) => {
        grupos[grupoNome].totais.meses[mes] = 0;
      });
    }
    
    // Adicionar categoria ao grupo
    grupos[grupoNome].categorias.push({
      ...linha,
      meses: mesesOrdenados.reduce((acc, mes) => {
        acc[mes] = linha.meses[mes] || 0;
        return acc;
      }, {}),
    });
    
    // Somar ao total do grupo
    mesesOrdenados.forEach((mes) => {
      grupos[grupoNome].totais.meses[mes] += linha.meses[mes] || 0;
    });
    grupos[grupoNome].totais.total += linha.total;
  });
  
  // Converter para array e ordenar categorias dentro de cada grupo
  return Object.values(grupos).map((grupo) => {
    grupo.categorias.sort((a, b) => b.total - a.total);
    
    // Calcular média do grupo
    const quantidadeMeses = mesesOrdenados.length;
    grupo.totais.media = quantidadeMeses > 0 ? grupo.totais.total / quantidadeMeses : 0;
    
    return grupo;
  }).sort((a, b) => b.totais.total - a.totais.total);
}

module.exports = new DreController();
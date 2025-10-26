const { models } = require('../models');
const { Movimento, Conta, Categoria } = models;
const { Op } = require('sequelize');
const sequelize = require('sequelize');

class DashboardController {
  // GET /dashboard
  async index(req, res) {
    try {
      const user_id = req.userId;
      const { data_inicio, data_fim } = req.query;

      // Obter data do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      // Formatar datas para YYYY-MM-DD
      const primeiroDiaMesStr = primeiroDiaMes.toISOString().split('T')[0];
      const ultimoDiaMesStr = ultimoDiaMes.toISOString().split('T')[0];

      // 1. Saldo Total (soma de todas as contas ativas)
      const contas = await Conta.findAll({
        where: {
          user_id,
          ativa: true,
        },
        attributes: ['saldo_atual'],
      });

      const saldoTotal = contas.reduce((acc, conta) => {
        return acc + parseFloat(conta.saldo_atual || 0);
      }, 0);

      // 2. Total de Receitas do mês atual (movimentos pagos)
      const receitasMes = await Movimento.findAll({
        where: {
          user_id,
          tipo: 'receita',
          data_competencia: {
            [Op.between]: [primeiroDiaMesStr, ultimoDiaMesStr],
          },
          pago: true,
        },
        attributes: ['valor'],
      });

      const totalReceitasMes = receitasMes.reduce((acc, mov) => {
        return acc + parseFloat(mov.valor || 0);
      }, 0);

      // 3. Total de Despesas do mês atual (movimentos pagos)
      const despesasMes = await Movimento.findAll({
        where: {
          user_id,
          tipo: 'despesa',
          data_competencia: {
            [Op.between]: [primeiroDiaMesStr, ultimoDiaMesStr],
          },
          pago: true,
        },
        attributes: ['valor'],
      });

      const totalDespesasMes = despesasMes.reduce((acc, mov) => {
        return acc + parseFloat(mov.valor || 0);
      }, 0);

      // 4. Economia do mês (receitas - despesas)
      const economiaMes = totalReceitasMes - totalDespesasMes;

      // 5. Gastos por categoria (com filtro de datas opcional)
      let dataInicioGrafico = primeiroDiaMesStr;
      let dataFimGrafico = ultimoDiaMesStr;

      if (data_inicio && data_fim) {
        dataInicioGrafico = data_inicio;
        dataFimGrafico = data_fim;
      }

      const gastosPorCategoria = await Movimento.findAll({
        where: {
          user_id,
          tipo: 'despesa',
          data_competencia: {
            [Op.between]: [dataInicioGrafico, dataFimGrafico],
          },
          pago: true,
          categoria_id: {
            [Op.not]: null,
          },
        },
        attributes: [
          'categoria_id',
          [sequelize.fn('SUM', sequelize.col('valor')), 'total'],
        ],
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'cor', 'icone'],
          },
        ],
        group: ['categoria_id', 'categoria.id', 'categoria.nome', 'categoria.cor', 'categoria.icone'],
        order: [[sequelize.fn('SUM', sequelize.col('valor')), 'DESC']],
      });

      // Formatar dados do gráfico
      const dadosGrafico = gastosPorCategoria.map((item) => ({
        categoria_id: item.categoria_id,
        categoria_nome: item.categoria?.nome || 'Sem categoria',
        categoria_cor: item.categoria?.cor || '#999999',
        categoria_icone: item.categoria?.icone || null,
        total: parseFloat(item.dataValues.total || 0),
      }));

      return res.json({
        saldo_total: parseFloat(saldoTotal.toFixed(2)),
        receitas_mes_atual: parseFloat(totalReceitasMes.toFixed(2)),
        despesas_mes_atual: parseFloat(totalDespesasMes.toFixed(2)),
        economia_mes_atual: parseFloat(economiaMes.toFixed(2)),
        periodo_grafico: {
          data_inicio: dataInicioGrafico,
          data_fim: dataFimGrafico,
        },
        gastos_por_categoria: dadosGrafico,
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return res.status(500).json({
        message: 'Erro ao buscar dados do dashboard',
        error: error.message,
      });
    }
  }
}

module.exports = new DashboardController();

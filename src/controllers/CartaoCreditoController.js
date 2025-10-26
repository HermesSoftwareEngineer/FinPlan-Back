const { models } = require('../models');
const { CartaoCredito, Fatura, Movimento, Conta } = models;
const { Op } = require('sequelize');

class CartaoCreditoController {
  // Função auxiliar para criar faturas do cartão (Jan/2025 a Dez/2030)
  async criarFaturasIniciais(cartao_id, dia_fechamento, dia_vencimento, user_id, conta_id) {
    const faturas = [];
    const startYear = 2025;
    const endYear = 2030;

    for (let ano = startYear; ano <= endYear; ano++) {
      for (let mes = 1; mes <= 12; mes++) {
        const dataFechamento = new Date(ano, mes - 1, dia_fechamento);
        const dataVencimento = new Date(ano, mes - 1, dia_vencimento);

        const fatura = await Fatura.create({
          mes_referencia: mes,
          ano_referencia: ano,
          data_fechamento: dataFechamento.toISOString().split('T')[0],
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          valor_total: 0,
          valor_pago: 0,
          status: 'aberta',
          cartao_id: cartao_id,
          conta_id: conta_id, // Usar conta padrão do cartão
        });

        faturas.push(fatura);
      }
    }

    return faturas;
  }

  // Listar todos os cartões do usuário
  index = async (req, res) => {
    try {
      const cartoes = await CartaoCredito.findAll({
        where: { user_id: req.userId },
        order: [['nome', 'ASC']],
      });

      // Calcular estatísticas
      const total_cartoes = cartoes.length;
      const cartoes_ativos = cartoes.filter(c => c.ativo).length;
      const limite_total = cartoes.reduce((sum, c) => sum + parseFloat(c.limite), 0);
      const limite_utilizado_total = cartoes.reduce((sum, c) => sum + parseFloat(c.limite_utilizado), 0);
      const limite_disponivel = limite_total - limite_utilizado_total;

      return res.json({
        estatisticas: {
          total_cartoes,
          cartoes_ativos,
          limite_total: parseFloat(limite_total.toFixed(2)),
          limite_utilizado: parseFloat(limite_utilizado_total.toFixed(2)),
          limite_disponivel: parseFloat(limite_disponivel.toFixed(2)),
        },
        cartoes,
      });
    } catch (error) {
      console.error('Erro ao listar cartões:', error);
      return res.status(500).json({ error: 'Erro ao listar cartões' });
    }
  };

  // Buscar um cartão específico
  show = async (req, res) => {
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
  };

  // Criar novo cartão
  store = async (req, res) => {
    try {
      const { nome, limite, dia_fechamento, dia_vencimento, bandeira, ultimos_digitos, cor, ativo, conta_id } = req.body;

      // Verificar se a conta pertence ao usuário (se fornecida)
      if (conta_id) {
        const conta = await Conta.findOne({
          where: { id: conta_id, user_id: req.userId },
        });

        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
      }

      const cartao = await CartaoCredito.create({
        nome,
        limite,
        dia_fechamento,
        dia_vencimento,
        bandeira,
        ultimos_digitos,
        cor,
        ativo,
        conta_id: conta_id || null,
        user_id: req.userId,
      });

      // Criar faturas de Jan/2025 a Dez/2030
      await this.criarFaturasIniciais(
        cartao.id,
        dia_fechamento,
        dia_vencimento,
        req.userId,
        conta_id || null
      );

      return res.status(201).json({
        message: 'Cartão criado com sucesso! 72 faturas geradas (Jan/2025 a Dez/2030)',
        cartao,
      });
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
  };

  // Atualizar cartão
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, limite, dia_fechamento, dia_vencimento, bandeira, ultimos_digitos, cor, ativo, conta_id } = req.body;

      const cartao = await CartaoCredito.findOne({
        where: { id, user_id: req.userId },
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

      await cartao.update({
        nome,
        limite,
        dia_fechamento,
        dia_vencimento,
        bandeira,
        ultimos_digitos,
        cor,
        ativo,
        conta_id: conta_id !== undefined ? conta_id : cartao.conta_id,
      });

      // Se a conta_id foi alterada, atualizar faturas futuras (ainda não pagas)
      if (conta_id !== undefined && conta_id !== cartao.conta_id) {
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        await Fatura.update(
          { conta_id: conta_id },
          {
            where: {
              cartao_id: id,
              status: ['aberta', 'fechada'],
              // Atualizar apenas faturas futuras ou do mês atual
              [Op.or]: [
                { ano_referencia: { [Op.gt]: anoAtual } },
                {
                  ano_referencia: anoAtual,
                  mes_referencia: { [Op.gte]: mesAtual },
                },
              ],
            },
          }
        );
      }

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
  };

  // Deletar cartão
  destroy = async (req, res) => {
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
  };
}

module.exports = new CartaoCreditoController();

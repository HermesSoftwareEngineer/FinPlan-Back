const { models } = require('../models');
const { Categoria } = models;

class CategoriaController {
  // Listar todas as categorias do usuário
  async index(req, res) {
    try {
      const { tipo } = req.query;

      const where = { user_id: req.userId };
      if (tipo) {
        where.tipo = tipo;
      }

      const categorias = await Categoria.findAll({
        where,
        order: [['nome', 'ASC']],
      });

      return res.json(categorias);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      return res.status(500).json({ error: 'Erro ao listar categorias' });
    }
  }

  // Buscar uma categoria específica
  async show(req, res) {
    try {
      const { id } = req.params;

      const categoria = await Categoria.findOne({
        where: { id, user_id: req.userId },
      });

      if (!categoria) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      return res.json(categoria);
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      return res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  // Criar nova categoria
  async store(req, res) {
    try {
      const { nome, tipo, cor, icone } = req.body;

      const categoria = await Categoria.create({
        nome,
        tipo,
        cor,
        icone,
        user_id: req.userId,
      });

      return res.status(201).json(categoria);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  // Atualizar categoria
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, tipo, cor, icone } = req.body;

      const categoria = await Categoria.findOne({
        where: { id, user_id: req.userId },
      });

      if (!categoria) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      await categoria.update({
        nome,
        tipo,
        cor,
        icone,
      });

      return res.json(categoria);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  // Deletar categoria
  async delete(req, res) {
    try {
      const { id } = req.params;

      const categoria = await Categoria.findOne({
        where: { id, user_id: req.userId },
      });

      if (!categoria) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      await categoria.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      return res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
}

module.exports = new CategoriaController();

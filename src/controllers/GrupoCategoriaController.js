const { models } = require('../models');
const { GrupoCategoria } = models;

class GrupoCategoriaController {
  // Listar todos os grupos
  async index(req, res) {
    try {
      const grupos = await GrupoCategoria.findAll({
        order: [['nome', 'ASC']],
        include: [
          {
            association: 'categorias',
            attributes: ['id', 'nome', 'tipo'],
          },
        ],
      });

      return res.json(grupos);
    } catch (error) {
      console.error('Erro ao listar grupos de categorias:', error);
      return res.status(500).json({ error: 'Erro ao listar grupos de categorias' });
    }
  }

  // Buscar um grupo específico
  async show(req, res) {
    try {
      const { id } = req.params;

      const grupo = await GrupoCategoria.findByPk(id, {
        include: [
          {
            association: 'categorias',
            attributes: ['id', 'nome', 'tipo', 'cor', 'icone'],
          },
        ],
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      return res.json(grupo);
    } catch (error) {
      console.error('Erro ao buscar grupo:', error);
      return res.status(500).json({ error: 'Erro ao buscar grupo' });
    }
  }

  // Criar novo grupo
  async store(req, res) {
    try {
      const { nome, descricao, cor, icone } = req.body;

      const grupo = await GrupoCategoria.create({
        nome,
        descricao,
        cor,
        icone,
      });

      return res.status(201).json(grupo);
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao criar grupo' });
    }
  }

  // Atualizar grupo
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, cor, icone } = req.body;

      const grupo = await GrupoCategoria.findByPk(id);

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      await grupo.update({
        nome,
        descricao,
        cor,
        icone,
      });

      return res.json(grupo);
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message),
        });
      }

      return res.status(500).json({ error: 'Erro ao atualizar grupo' });
    }
  }

  // Deletar grupo
  async delete(req, res) {
    try {
      const { id } = req.params;

      const grupo = await GrupoCategoria.findByPk(id);

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      await grupo.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar grupo:', error);
      return res.status(500).json({ error: 'Erro ao deletar grupo' });
    }
  }
}

module.exports = new GrupoCategoriaController();

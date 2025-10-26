const { Model, DataTypes } = require('sequelize');

class GrupoCategoria extends Model {
  static init(sequelize) {
    super.init(
      {
        nome: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Nome do grupo é obrigatório',
            },
          },
        },
        descricao: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        cor: {
          type: DataTypes.STRING(7),
          allowNull: true,
          validate: {
            is: /^#[0-9A-F]{6}$/i,
          },
        },
        icone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'grupos_categorias',
        underscored: true,
      }
    );
    return this;
  }

  static associate(models) {
    this.hasMany(models.Categoria, {
      foreignKey: 'grupo_id',
      as: 'categorias',
    });
  }
}

module.exports = GrupoCategoria;

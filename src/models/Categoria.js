const { Model, DataTypes } = require('sequelize');

class Categoria extends Model {
  static init(sequelize) {
    super.init(
      {
        nome: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Nome da categoria é obrigatório',
            },
          },
        },
        tipo: {
          type: DataTypes.ENUM('receita', 'despesa'),
          allowNull: false,
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
        grupo_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'grupos_categorias',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      {
        sequelize,
        tableName: 'categorias',
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'usuario' });
    this.belongsTo(models.GrupoCategoria, { foreignKey: 'grupo_id', as: 'grupo' });
    this.hasMany(models.Movimento, { foreignKey: 'categoria_id', as: 'movimentos' });
  }
}

module.exports = Categoria;

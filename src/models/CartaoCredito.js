const { Model, DataTypes } = require('sequelize');

class CartaoCredito extends Model {
  static init(sequelize) {
    super.init(
      {
        nome: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Nome do cartão é obrigatório',
            },
          },
        },
        limite: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        limite_utilizado: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        dia_fechamento: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 31,
          },
        },
        dia_vencimento: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 31,
          },
        },
        bandeira: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        ultimos_digitos: {
          type: DataTypes.STRING(4),
          allowNull: true,
          validate: {
            len: [4, 4],
          },
        },
        cor: {
          type: DataTypes.STRING(7),
          allowNull: true,
          validate: {
            is: /^#[0-9A-F]{6}$/i,
          },
        },
        ativo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        conta_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'contas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        sequelize,
        tableName: 'cartoes_credito',
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'usuario' });
    this.belongsTo(models.Conta, { foreignKey: 'conta_id', as: 'conta' });
    this.hasMany(models.Fatura, { foreignKey: 'cartao_id', as: 'faturas' });
  }
}

module.exports = CartaoCredito;

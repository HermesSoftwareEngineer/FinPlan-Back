const { Model, DataTypes } = require('sequelize');

class Conta extends Model {
  static init(sequelize) {
    super.init(
      {
        nome: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Nome da conta é obrigatório',
            },
          },
        },
        tipo: {
          type: DataTypes.ENUM('corrente', 'poupanca', 'investimento', 'dinheiro'),
          allowNull: false,
          defaultValue: 'corrente',
        },
        saldo_inicial: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        saldo_atual: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        cor: {
          type: DataTypes.STRING(7),
          allowNull: true,
          validate: {
            is: /^#[0-9A-F]{6}$/i,
          },
        },
        ativa: {
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
      },
      {
        sequelize,
        tableName: 'contas',
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'usuario' });
    this.hasMany(models.Movimento, { foreignKey: 'conta_id', as: 'movimentos' });
  }
}

module.exports = Conta;

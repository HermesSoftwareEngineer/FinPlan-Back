const { Model, DataTypes } = require('sequelize');

class Fatura extends Model {
  static init(sequelize) {
    super.init(
      {
        mes_referencia: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 12,
          },
        },
        ano_referencia: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 2000,
          },
        },
        data_fechamento: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        data_vencimento: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        valor_total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        valor_pago: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        status: {
          type: DataTypes.ENUM('aberta', 'fechada', 'paga', 'atrasada'),
          allowNull: false,
          defaultValue: 'aberta',
        },
        cartao_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'cartoes_credito',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        movimento_pagamento_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'movimentos',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
        tableName: 'faturas',
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.CartaoCredito, { foreignKey: 'cartao_id', as: 'cartao' });
    this.belongsTo(models.Conta, { foreignKey: 'conta_id', as: 'conta' });
    this.hasMany(models.Movimento, { foreignKey: 'fatura_id', as: 'movimentos' });
    this.belongsTo(models.Movimento, { foreignKey: 'movimento_pagamento_id', as: 'movimento_pagamento' });
  }
}

module.exports = Fatura;

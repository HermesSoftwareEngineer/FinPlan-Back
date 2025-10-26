const { Model, DataTypes } = require('sequelize');

class Movimento extends Model {
  static init(sequelize) {
    super.init(
      {
        descricao: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Descrição é obrigatória',
            },
          },
        },
        valor: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        tipo: {
          type: DataTypes.ENUM('receita', 'despesa', 'transferencia'),
          allowNull: false,
        },
        data_competencia: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        data_pagamento: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        pago: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        origem: {
          type: DataTypes.ENUM('manual', 'cartao', 'fatura'),
          allowNull: false,
          defaultValue: 'manual',
        },
        recorrente: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        parcelado: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        numero_parcela: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        total_parcelas: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        conta_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'contas',
            key: 'id',
          },
        },
        categoria_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'categorias',
            key: 'id',
          },
        },
        fatura_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'faturas',
            key: 'id',
          },
        },
        sequencia_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'sequencias',
            key: 'id',
          },
        },
        sequencia_numero: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'movimentos',
        hooks: {
          beforeSave: async (movimento) => {
            // Se marcar como pago e não tiver data de pagamento, usar a data atual
            if (movimento.changed('pago') && movimento.pago && !movimento.data_pagamento) {
              movimento.data_pagamento = new Date();
            }
            // Se desmarcar como pago, limpar a data de pagamento
            if (movimento.changed('pago') && !movimento.pago) {
              movimento.data_pagamento = null;
            }
          },
        },
      }
    );
    return this;
  }

  static associate(models) {
  this.belongsTo(models.User, { foreignKey: 'user_id', as: 'usuario' });
  this.belongsTo(models.Conta, { foreignKey: 'conta_id', as: 'conta' });
  this.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
  this.belongsTo(models.Fatura, { foreignKey: 'fatura_id', as: 'fatura' });
  this.belongsTo(models.Sequencia, { foreignKey: 'sequencia_id', as: 'sequencia' });
  }
}

module.exports = Movimento;

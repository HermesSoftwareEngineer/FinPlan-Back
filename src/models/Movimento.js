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
        data: {
          type: DataTypes.DATEONLY,
          allowNull: false,
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
        categoria_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'categorias',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        fatura_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'faturas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        sequelize,
        tableName: 'movimentos',
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'usuario' });
    this.belongsTo(models.Conta, { foreignKey: 'conta_id', as: 'conta' });
    this.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
    this.belongsTo(models.Fatura, { foreignKey: 'fatura_id', as: 'fatura' });
  }
}

module.exports = Movimento;

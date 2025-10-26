const { Model, DataTypes } = require('sequelize');

class Sequencia extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      descricao: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_inicio: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      data_fim: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
    }, {
      sequelize,
      tableName: 'sequencias',
      timestamps: false,
    });
  }

  static associate(models) {
    this.hasMany(models.Movimento, { foreignKey: 'sequencia_id', as: 'movimentos' });
  }
}

module.exports = Sequencia;

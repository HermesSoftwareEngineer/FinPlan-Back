const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Nome é obrigatório',
            },
          },
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: {
            msg: 'Email já cadastrado',
          },
          validate: {
            isEmail: {
              msg: 'Email inválido',
            },
            notEmpty: {
              msg: 'Email é obrigatório',
            },
          },
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Senha é obrigatória',
            },
            len: {
              args: [6, 100],
              msg: 'A senha deve ter entre 6 e 100 caracteres',
            },
          },
        },
      },
      {
        sequelize,
        tableName: 'users',
        hooks: {
          beforeSave: async (user) => {
            if (user.changed('password')) {
              user.password = await bcrypt.hash(user.password, 10);
            }
          },
        },
      }
    );
    return this;
  }

  // Método para verificar senha
  async checkPassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

module.exports = User;

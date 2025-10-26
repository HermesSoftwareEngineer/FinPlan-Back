const Sequelize = require('sequelize');
const dbConfig = require('../config/database');

// Importar models
const User = require('./User');
const Conta = require('./Conta');
const GrupoCategoria = require('./GrupoCategoria');
const Categoria = require('./Categoria');
const CartaoCredito = require('./CartaoCredito');
const Fatura = require('./Fatura');
const Movimento = require('./Movimento');
const Sequencia = require('./Sequencia');

// Criar conexão
const sequelize = new Sequelize(dbConfig);

// Inicializar models
User.init(sequelize);
Conta.init(sequelize);
GrupoCategoria.init(sequelize);
Categoria.init(sequelize);
CartaoCredito.init(sequelize);
Fatura.init(sequelize);
Sequencia.init(sequelize);
Movimento.init(sequelize);

// Associações entre models
const models = {
  User,
  Conta,
  GrupoCategoria,
  Categoria,
  CartaoCredito,
  Fatura,
  Sequencia,
  Movimento,
};

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Sincronizar com o banco de dados
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar banco de dados:', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  models,
};

const Sequelize = require('sequelize');
const dbConfig = require('../config/database');

// Importar models
const User = require('./User');

// Criar conexão
const sequelize = new Sequelize(dbConfig);

// Inicializar models
User.init(sequelize);

// Associações (quando houver relacionamentos entre models)
// User.associate(sequelize.models);

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
  models: {
    User,
  },
};

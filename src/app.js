require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');
const { syncDatabase } = require('./models');

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
    this.database();
  }

  middlewares() {
    this.server.use(cors());
    this.server.use(express.json());
  }

  routes() {
    this.server.use(routes);
  }

  database() {
    syncDatabase();
  }
}

module.exports = new App().server;

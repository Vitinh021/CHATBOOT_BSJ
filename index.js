const axios = require('axios');
//const server = require('./app/config/server.js');

const express = require('express');
const app = express();

const routes = require('./app/controllers/routes.js')

let url = 'https://gestaobsj.com.br/Server/status.php?getByPhone=true&phone=8';
console.log('deu adasdas')

axios.get(url, { timeout: 5000000 }) // Definindo o timeout como 50 segundos
  .then(response => {
    console.log('deu certo')
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

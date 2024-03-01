const axios = require('axios');
//const server = require('./app/config/server.js');

const express = require('express');
const app = express();

const routes = require('./app/controllers/routes.js')

let url = 'https://gestaobsj.com.br/Server/status.php?getByPhone=true&phone=8';

axios.get(url, { timeout: 50000 }) // Definindo o timeout como 50 segundos
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
app.get('/teste', async (req, res) => {
  res.status(200).send('ok');
  let url = 'https://gestaobsj.com.br/Server/status.php?getByPhone=true&phone=8'
 await fetch(url)
  .then(response => {
    setTimeout(() => {
      console.log(response);
    }, 5000)
  })
  .catch(error => {
    console.error('Error:', error);
  });
})

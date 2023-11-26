//const server = require('./app/config/server.js');

const express = require('express');
const app = express();

const routes = require('./app/controllers/routes.js')

app.use('/', routes)


app.listen(3000, () => {
    console.log(`rodando na porta 3000`)
})

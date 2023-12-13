const express = require('express');
const utils = require('./utils.js');

//COMO FAZER A CONSULTA NO BANCO
//connection.query('SELECT * FROM usuarios', (error, results) => {
//  if (error) {
//    console.error('Erro ao executar a consulta:', error);
//    res.status(500).send('Erro ao buscar usuários.');
//    return;
//  }
//  res.json(results);
//});

const app = express();


const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');

wppconnect
  .create({
    session: 'sessionName',
    catchQR: (base64Qr, asciiQR) => {
      console.log(asciiQR); // Optional to log the QR in the terminal
      var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');

      var imageBuffer = response;
      require('fs').writeFile('out.png', imageBuffer['data'], 'binary', function (err) {
          if (err != null) {
            console.log(err);
          } else {
                // Ler o arquivo recém-criado e enviar como resposta
                fs.readFile('out.png', function (error, data) {
                    if (error) {
                        console.error(error);
                        res.status(500).send('Erro ao ler o arquivo');
                    } else {
                        res.writeHead(200, {
                            'Content-Type': 'image/png'
                        });
                        res.end(data); // Enviar o conteúdo do arquivo como resposta
                    }
                });
            }
        }
      );
    },
    logQR: false,
  })
  .then((client) => utils.start(client))
  .catch((error) => console.log(error));


//LEMBRAR DE COLOCAR DO const fs = require('fs'); ATE .catch((error) => console.log(error)); DENTRO DA ROTA
//app.post('/gerar', (req, res) => {
//
//});

module.exports = app;
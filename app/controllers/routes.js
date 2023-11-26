const express = require('express');
const app = express();

app.post('/gerar', (req, res) => {
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
      .then((client) => start(client))
      .catch((error) => console.log(error));

      function start(client) {
        client.onMessage((message) => {

            if (message.body == 'oi') {
                client
                    .sendText(message.from, 'Olá, BANCA SÃO JOSÉ, agradece seu contato. \n *Selecione uma data* 1.${data[0] }')
                    .then((result) => {
                        console.log('Result: ', result)
                    })
                    .catch((erro) => {
                        console.error("Erro misera: ", erro);
                    });
            }else if (message.body == 1){
              console.log("aaaa")
            }else{
              console.log("qualaer cosas")
            }
        });
      }

      function getDatas() {
        let datesList = [];
        const today = new Date();
      
        for (let i = 0; i < 10; i++) {
          const previousDate = new Date(today);
          previousDate.setDate(today.getDate() - i);
      
          const formattedDate = `${previousDate.getDate().toString().padStart(2, '0')}/${
            (previousDate.getMonth() + 1).toString().padStart(2, '0')
          }/${previousDate.getFullYear()}`;
      
          datesList.push(formattedDate);
        }
        return datesList;
      }
});

module.exports = app;
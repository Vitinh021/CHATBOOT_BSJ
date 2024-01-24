const express = require('express');
const controller = require('./maincontroller.js');
const service = require('../service/StatusService.js');
const type = require('./types');

const app = express();

const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
wppconnect
  .create({
    session: "sessionName",
    headless: true, // Headles  s chrome
    debug: true,
    catchQR: (base64Qr, asciiQR) => {
      console.log("DESGRAÇAAAAAAAAAAAA::: " + asciiQR); // Optional to log the QR in the terminal
      console.log()   
      console.log()   
      console.log()   
      var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

        console.log("DESGRAÇAAAAAAAAAAAA 222222::: " + matches.length)
        console.log()
        console.log()
        console.log()
      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');

      var imageBuffer = response;
      require('fs').writeFile('out.png', imageBuffer['data'], 'binary', function (err) {
          if (err != null) {
            console.log("DESGRAÇAAAAAAAAAAAA 33333::: " + err)
            console.log()
            console.log()
            console.log()
            console.log(err);
          } else {
                // Ler o arquivo recém-criado e enviar como resposta
                fs.readFile('out.png', function (error, data) {
                    if (error) {
                        console.error(error);
                        //res.status(500).send('Erro ao ler o arquivo');
                    } else {
                     /*  console.log()
                      console.log()
                      console.log()
                      console.log("DESCRAÇA RESSS:::::" + res)
                      console.log()
                      console.log()
                      console.log()
                        res.writeHead(200, {
                            'Content-Type': 'image/png'
                        });
                        res.end(data); // Enviar o conteúdo do arquivo como resposta */
                    }
                });
            }
        }
      );
    }
  })
  .then((client) => start(client))
  .catch((error) => console.log(error));

app.get('/gerar', (req, res) => {
  const fs = require('fs');
  const wppconnect = require('@wppconnect-team/wppconnect');

  wppconnect
    .create({
      session: 'sessionName',
      catchQR: (base64Qr, asciiQR) => {
        console.log("DESGRAÇAAAAAAAAAAAA::: " + asciiQR); // Optional to log the QR in the terminal
        console.log()   
        console.log()   
        console.log()   
        var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
          response = {};

          console.log("DESGRAÇAAAAAAAAAAAA 222222::: " + matches.length)
          console.log()
          console.log()
          console.log()
        if (matches.length !== 3) {
          return new Error('Invalid input string');
        }
        response.type = matches[1];
        response.data = new Buffer.from(matches[2], 'base64');

        var imageBuffer = response;
        require('fs').writeFile('out.png', imageBuffer['data'], 'binary', function (err) {
            if (err != null) {
              console.log("DESGRAÇAAAAAAAAAAAA 33333::: " + err)
              console.log()
              console.log()
              console.log()
              console.log(err);
            } else {
                  // Ler o arquivo recém-criado e enviar como resposta
                  fs.readFile('out.png', function (error, data) {
                      if (error) {
                          console.error(error);
                          res.status(500).send('Erro ao ler o arquivo');
                      } else {
                        console.log()
                        console.log()
                        console.log()
                        console.log("DESCRAÇA RESSS:::::" + res)
                        console.log()
                        console.log()
                        console.log()
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

})


//Funcao principal, contem todos os caminhos que o cliente pode percorrer no whatsApp
function start(client) {

  let dataEscolhida = null

  client.onMessage(async (message) => {

  /*
  // COMO SUBIR APLICAÇÃO NA HOSTIGER
  // CRIAR FRONT PARA RECEBER QR-CODE
  // INFORMAR SE O QR-CODE FOI LIDO E SE A APLICAÇÃO ESTPA RODANDO OU NÃO (PING-PONG)
  */

  var chatId = message.chatId;
  var phone = message.from;
  var nome  = message.notifyName.split(' ')[0] ?? 'Usuário';
  var status 

  await service.getByPhone(phone)
    .then((data)=>{
      if (data){//se existir
        status = data.status
        var dataServer = new Date(data.data_hora);
        var dataAtual = new Date();
        var diferenca_tempo = 10 * 60 * 1000; // 10 minutos em milissegundos
        if (dataAtual - dataServer >= diferenca_tempo) {
            service.updateStatus(phone,type.BEM_VINDO)
            status = type.BEM_VINDO
        } 
      }else{
        service.createStatus(phone)
        status = type.BEM_VINDO
      }
    })

    let opcaoNumero = parseInt(message.body)
    if (status == type.BEM_VINDO && message.body != '') {
      controller.bemVindo(client, phone, nome)
      service.updateStatus(phone,type.ESCOLHA_ATENDIMENTO)
    }
      
    else if (status == type.ESCOLHA_ATENDIMENTO && message.body == '1') {
      service.updateStatus(phone,type.ATENDIMENTO_EXTRACAO_DATA)
      controller.imprimirDatas(client, phone)
    }
    
    else if(status == type.ESCOLHA_ATENDIMENTO && message.body == '2'){
      service.updateStatus(phone,type.ATENDIMENTO_FUNCIONARIO)
      controller.iniciaAtendimento(client, phone)
    }
    
    else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == type.ATENDIMENTO_EXTRACAO_DATA)){
        dataEscolhida = controller.getData(opcaoNumero)            
        controller.imprimirHorario(client, phone, dataEscolhida)
        service.updateStatus(phone,type.ATENDIMENTO_EXTRACAO_HORA)
    }
    
    else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero < 10) && (status == type.ATENDIMENTO_EXTRACAO_HORA)){
      controller.getHorario(client, phone, opcaoNumero, dataEscolhida)
        .then((horarioEscolhido) => {
          controller.buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'))
          .then(data => {
            if (data){
              client.sendText(phone, controller.mensagemResultado(data))
              service.updateStatus(phone,type.CONFIRMACAO_NOVO_ATENDIMENTO)
            }
            else{
              throw new Error("Opção inválida! A opcao vai até 10.")
            }
          })

          .then(()=>{
            client.sendText(phone, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
          })

          .catch(error => {
            client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
            console.error('Erro ao obter dados:', error.message);
          })
        })
    }
      
    else if(status == type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='1'){
      controller.imprimirDatas(client, phone)
      service.updateStatus(phone,type.ATENDIMENTO_EXTRACAO_DATA)
    }
      
    else if((status==type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='2') || message.body=='0'){
      service.updateStatus(phone,type.BEM_VINDO)
      controller.finalizarAtendimento(client, phone)
    }
    
    else if(status != type.ATENDIMENTO_FUNCIONARIO){
      client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
    }
  }); 
}

module.exports = app;
const express = require('express');
const controller = require('./maincontroller.js');
const service = require('../service/StatusService.js');
const type = require('./types');

const app = express();

//service.readStatus(8799906)
//service.createStatus("666")
service.updateStatus("666",type.ATENDIMENTO_FUNCIONARIO)

const wppconnect = require('@wppconnect-team/wppconnect');
wppconnect
  .create({
    session: "sessionName",
    headless: true, // Headless chrome
    debug: true,
  })
  .then((client) => start(client))
  .catch((error) => console.log(error));

//Funcao principal, contem todos os caminhos que o cliente pode percorrer no whatsApp
function start(client) {

  setTimeout(() => {
    client.stopPhoneWatchdog(chatId)
      .then(() => {
        client.sendText(phone, "FICAMOS FELIZES EM ATENDÊ-LO,\nAGRADECEMOS A PREFERÊNCIA. 😃")
        //status = type.BEM_VINDO
      })
      .catch((error) => {
        console.error('Erro ao cancelar o atendimento:', error);
      });
  }, 50000);


  let dataEscolhida = null
  
  client.onMessage(async (message) => {//mensagem acaou de chegar

        /*
        //TABELA DO BANCO
        phone :: data/hora :: status 
        
        //LOGICA
        existe esse phone no banco?
          sim-> qual o status? 
                finalizado -> muda para bem_vindo e segue, update data/hora
               !finalizado -> pega o status e segue o baile
    
        se não existir
          -> cria e sague

        // COMO SUBIR APLICAÇÃO NA HOSTIGER
        // CRIAR FRONT PARA RECEBER QR-CODE
        // INFORMAR SE O QR-CODE FOI LIDO E SE A APLICAÇÃO ESTPA RODANDO OU NÃO (PING-PONG)

        */

        var chatId = message.chatId;
        var phone = message.from;
        var nome  = message.notifyName.split(' ')[0] ?? 'Usuário';
        var status 
        let res = service.readStatus()
        if (res.data){//se existir
          status = res.data.status
        }else{
          service.createStatus(phone)
        }

        let opcaoNumero = parseInt(message.body)

        if (status == type.BEM_VINDO && message.body != '') {
          controller.bemVindo(client, phone, nome)

          .status = type.ESCOLHA_ATENDIMENTO

        }else if (status == type.ESCOLHA_ATENDIMENTO && message.body == '1') {
          controller.imprimirDatas(client, phone)
          status = type.ATENDIMENTO_EXTRACAO_DATA
          tempoAtentimento(client, chatId, phone, 600000)//10 minutos
          console.log(status)

        }else if(status == type.ESCOLHA_ATENDIMENTO && message.body == '2'){
          controller.iniciaAtendimento(client, phone)
          status = type.ATENDIMENTO_FUNCIONARIO
          tempoAtentimento(client, chatId, phone, 900000)//tem 15 minutos
          
        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == type.ATENDIMENTO_EXTRACAO_DATA)){
            dataEscolhida = controller.getData(opcaoNumero)            
            controller.imprimirHorario(client, phone, dataEscolhida)
            status = type.ATENDIMENTO_EXTRACAO_HORA

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == type.ATENDIMENTO_EXTRACAO_HORA)){
          controller.getHorario(client, phone, opcaoNumero, dataEscolhida)
            .then((horarioEscolhido) => {
              controller.buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'))
              .then(data => {
                  client.sendText(phone, controller.mensagemResultado(data))
                  status = type.CONFIRMACAO_NOVO_ATENDIMENTO
                  client.sendText(phone, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
               })
  
               .catch(error => {
                 client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
                 console.error('Erro ao obter dados:', error);
               })
            })

        }else if(status == type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='1'){
          controller.imprimirDatas(client, phone)
          status = type.ATENDIMENTO_EXTRACAO_DATA

        }else if(status==type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='2'){
          tempoAtentimento(client, chatId, phone, 0, statusObject)
          
        }else if(message.body=='0'){
          status = tempoAtentimento(client, chatId, phone, 0, statusObject)

        }else if(status != type.ATENDIMENTO_FUNCIONARIO){
          client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")

        }
    });
}

//define o tempo de atendimento para cada cliente, após o tempo o chat finaliza o atendimento
function tempoAtentimento(client, chatId, phone, tempoDuracao, statusObject) {
  setTimeout(() => {
    client.stopPhoneWatchdog(chatId)
      .then(() => {
        client.sendText(phone, "FICAMOS FELIZES EM ATENDÊ-LO,\nAGRADECEMOS A PREFERÊNCIA. 😃")
        //status = type.BEM_VINDO
      })
      .catch((error) => {
        console.error('Erro ao cancelar o atendimento:', error);
      });
  }, tempoDuracao);
}

module.exports = app;
const express = require('express');
const controller = require('./mainController.js');
const type = require('./types');

const app = express();

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
    const statusObject = {status: type.BEM_VINDO}
    let dataEscolhida = null
    
    client.onMessage(async (message) => {
      console.log(statusObject.status)
        var chatId = message.chatId;
        var phone = message.from;
        var nome  = message.notifyName.split(' ')[0] ?? 'Usuário';
        let opcaoNumero = parseInt(message.body)

        if (statusObject.status == type.BEM_VINDO && message.body != '') {
          controller.bemVindo(client, phone, nome)
          statusObject.status = type.ESCOLHA_ATENDIMENTO

        }else if (statusObject.status == type.ESCOLHA_ATENDIMENTO && message.body == '1') {
          controller.imprimirDatas(client, phone)
          statusObject.status = type.ATENDIMENTO_EXTRACAO_DATA
          tempoAtentimento(client, chatId, phone, 600000)//10 minutos
          console.log(statusObject.status)

        }else if(statusObject.status == type.ESCOLHA_ATENDIMENTO && message.body == '2'){
          controller.iniciaAtendimento(client, phone)
          statusObject.status = type.ATENDIMENTO_FUNCIONARIO
          tempoAtentimento(client, chatId, phone, 900000)//tem 15 minutos
          
        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (statusObject.status == type.ATENDIMENTO_EXTRACAO_DATA)){
            dataEscolhida = controller.getData(opcaoNumero)            
            controller.imprimirHorario(client, phone, dataEscolhida)
            statusObject.status = type.ATENDIMENTO_EXTRACAO_HORA

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (statusObject.status == type.ATENDIMENTO_EXTRACAO_HORA)){
          controller.getHorario(client, phone, opcaoNumero, dataEscolhida)
            .then((horarioEscolhido) => {
              controller.buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'))
              .then(data => {
                  client.sendText(phone, controller.mensagemResultado(data))
                  statusObject.status = type.CONFIRMACAO_NOVO_ATENDIMENTO
                  client.sendText(phone, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
               })
  
               .catch(error => {
                 client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
                 console.error('Erro ao obter dados:', error);
               })
            })

        }else if(statusObject.status == type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='1'){
          controller.imprimirDatas(client, phone)
          statusObject.status = type.ATENDIMENTO_EXTRACAO_DATA

        }else if(statusObject.status==type.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='2'){
          tempoAtentimento(client, chatId, phone, 0, statusObject)
          
        }else if(message.body=='0'){
          statusObject.status = tempoAtentimento(client, chatId, phone, 0, statusObject)

        }else if(statusObject.status != type.ATENDIMENTO_FUNCIONARIO){
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
        statusObject.status = type.BEM_VINDO
      })
      .catch((error) => {
        console.error('Erro ao cancelar o atendimento:', error);
      });
  }, tempoDuracao);
}

module.exports = app;
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
    var status = type.BEM_VINDO
    let dataEscolhida = null
    
    client.onMessage(async (message) => {
        const chatId = message.chatId;
        var phone = message.from;
        var nome  = message.notifyName.split(' ')[0] ?? 'Usuário';
        let opcaoNumero = parseInt(message.body)

        if (status == type.BEM_VINDO && message.body != '') {
          controller.bemVindo(client, phone, nome)
          status = type.ESCOLHA_ATENDIMENTO

        }else if (status == type.ESCOLHA_ATENDIMENTO && message.body == '1') {
          controller.imprimirDatas(client, phone)
          status = type.ATENDIMENTO_EXTRACAO_DATA
          tempoAtentimento(client, chatId, message, 30000)//10 minutos

        }else if(status == type.ESCOLHA_ATENDIMENTO && message.body == '2'){
          controller.iniciaAtendimento(client, phone)
          status = type.ATENDIMENTO_FUNCIONARIO
          tempoAtentimento(client, chatId, message, 900000)//tem 15 minutos
          
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
          tempoAtentimento(client, chatId, phone, 0)
          status = type.BEM_VINDO

        }else if(status != type.ATENDIMENTO_FUNCIONARIO){
          client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")

        }else if(message.body=='0'){
          //esse status nãi retorna nada, veja por que
          status = tempoAtentimento(client, chatId, phone, 0)
        }
    });
}

//define o tempo de atendimento para cada cliente, após o tempo o chat finaliza o atendimento
function tempoAtentimento(client, chatId, phone, tempoDuracao) {
  setTimeout(() => {
    client.stopPhoneWatchdog(chatId)
      .then(() => {
        client.sendText(phone, "FICAMOS FELIZES EM ATENDER,\nAGRADECEMOS A PREFERÊNCIA. 😃")
        return type.BEM_VINDO
      })
      .catch((error) => {
        console.error('Erro ao cancelar o atendimento:', error);
      });
  }, tempoDuracao);
}

module.exports = app;
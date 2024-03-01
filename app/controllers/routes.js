const express = require('express');
const controller = require('./mainController.js');
const service = require('../service/StatusService.js');
const type = require('./types.js');
const wppconnect = require('@wppconnect-team/wppconnect');
const puppeteer = require('puppeteer-core');
const path = require('path');
const sharp = require('sharp');

require('dotenv').config();
const fs = require('fs');


const app = express();
const puppeteerOptions = {
  headless: true, // Se false, o navegador será aberto em uma janela visível
  defaultViewport: null, // Permite configurar o tamanho da janela do navegador
  args: ['--no-sandbox', '--disable-setuid-sandbox'], // Argumentos adicionais para o Chrome/Chromium
  executablePath: '/root/.cache/puppeteer/chrome-headless-shell/linux-121.0.6167.85/chrome-headless-shell-linux64/chrome-headless-shell' // Especifique o caminho do Chrome aqui
};

let url = 'https://gestaobsj.com.br/Server/status.php?getByPhone=true&phone=8'
 fetch(url, {
  method: 'GET',
  timeout: 50000
 })
  .then(response => {
    setTimeout(() => {
      console.log(response);
    }, 5000)
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

// Inicia o cliente wppconnect quando o servidor Node.js é iniciado
app.get('/run', async (req, res) => {
  try {
    const client = await wppconnect.create({
      session: "sessionName",
      headless: 'new',
      devtools: false,
      useChrome: false,
      debug: false,
      logQR: true,
      puppeteerOptions: puppeteerOptions,
      disableWelcome: true,
      updatesLog: false,
      autoClose: false,
      catchQR: (base64Qr, asciiQR) => {
        console.log("QR code recebido");
        var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
          response = {};
        if (matches.length !== 3) {
          throw new Error('Invalid input string');
        }
        response.type = matches[1];
        response.data = new Buffer.from(matches[2], 'base64');
        var imageBuffer = response;
        // Salvar a nova imagem
        sharp(imageBuffer['data'])
        .resize({ width: 500, height: 500 }) // Altere o tamanho conforme necessário
        .toBuffer()
        .then(newImageBuffer => {
            // Salvar a nova imagem
            require('fs').writeFile('out.png', newImageBuffer, 'binary', function (err) {
              if (err != null) {
                  throw new Error("Erro ao salvar QR code: " + err);
              } else {
                  // Configurar o estilo CSS da página para definir a cor de fundo
                  const htmlContent = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                          <style>
                              body {
                                  background-color: white; /* Defina a cor de fundo desejada aqui */
                              }
                          </style>
                      </head>
                      <body>
                          <img src="data:image/png;base64,${newImageBuffer.toString('base64')}">
                      </body>
                      </html>
                  `;

                  // Enviar a página HTML com a imagem para o cliente
                  res.writeHead(200, {
                      'Content-Type': 'text/html'
                  });
                  res.end(htmlContent);
              }
          });
        })
        .catch(err => {
            console.error("Erro ao redimensionar a imagem: ", err);
        });
      }
    });

    // Iniciar a aplicação após a criação do cliente
    await start(client);
  } catch (error) {
    console.error("Erro ao criar a sessão do WhatsApp:", error);
    console.error("Stack Trace:", error.stack);
    res.status(500).send("Erro ao criar a sessão do WhatsApp: " + JSON.stringify(error.stack));
  }
});
app.get('/env', (req, res) => {
  res.status(200).send(process.cwd())
})
app.get('/qrcode', (req, res) => {
  fs.readFile('out.png', function (error, data) {
    if (error) {
        res.status(500).send('Erro ao ler o arquivo');
    } else {
        res.writeHead(200, {
            'Content-Type': 'image/png'
        });
        res.end(data); // Enviar o conteúdo do arquivo como resposta
    }
  });
})

//Funcao principal, contem todos os caminhos que o cliente pode percorrer no whatsApp
function start(client) {

  let dataEscolhida = null

  client.onMessage(async (message) => {
  
  const telefoneAtendente=process.env.TELEFONE_ATENDENTE;
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
      //558799069152@c.us
      var tel = `(${phone.substring(2, 4)}) 9${phone.substring(4, 8)}-${phone.substring(8, 12)}`;
      client.sendText(telefoneAtendente, `O cliente ${nome}, de número ${tel} está aguardando por atendimento!`)
      service.updateStatus(phone,type.ATENDIMENTO_FUNCIONARIO)
      controller.iniciaAtendimento(client, phone)
    }
    
    else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == type.ATENDIMENTO_EXTRACAO_DATA)){
        dataEscolhida = controller.getData(opcaoNumero)            
        controller.imprimirHorario(client, phone, dataEscolhida)
        service.updateStatus(phone,type.ATENDIMENTO_EXTRACAO_HORA)
    }
    
    else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == type.ATENDIMENTO_EXTRACAO_HORA)){

      controller.getHorario(client, phone, opcaoNumero, dataEscolhida)
        .then((horarioEscolhido) => {
          controller.buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'), (horarioEscolhido == 'TODOS'))
           .then(async data => {
            if (data){
              
              if (horarioEscolhido == 'TODOS'){
                let mensagem_grande = ''
                await data.forEach((obj, index) => {
                  mensagem_grande = mensagem_grande + controller.mensagemResultado(obj) + '\n' + (index == data.length-1?'':'\n')
                  console.log(index,data.length)
                  console.log("-----------------------------------------------------------------------")
                  console.log(obj)
                });
                await client.sendText(phone, mensagem_grande)
              }else{
                await client.sendText(phone, controller.mensagemResultado(data))
              }

              service.updateStatus(phone,type.CONFIRMACAO_NOVO_ATENDIMENTO)
              client.sendText(phone, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
            }
            else{
              throw new Error("Opção inválida! A opcao vai até 10.")
            }
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
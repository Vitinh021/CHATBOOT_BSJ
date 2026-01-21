const express = require('express');
const controller = require('./mainController.js');
const service = require('../service/StatusService.js');
const type = require('./types.js');
const wppconnect = require('@wppconnect-team/wppconnect');
const puppeteer = require('puppeteer-core');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

require('dotenv').config();
const fs = require('fs');

const SESSION_NAME = process.env.WPP_SESSION || 'sessionName';
const AUTO_START = (process.env.WPP_AUTOSTART || 'true').toLowerCase() !== 'false';
const TOKENS_DIR = process.env.WPP_TOKENS_DIR || path.join(process.cwd(), 'tokens');

let lastQrAt = null;

// SINGLETON PATTERN: Armazena a instância global do cliente
let globalClient = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 60000; // 60 segundos

// Mapa para rastrear mensagens processadas recentemente (previne duplicação)
const processedMessages = new Map();
const MESSAGE_DEDUP_WINDOW = 5000; // 5 segundos

// Limpa mensagens antigas do cache de deduplicação
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_WINDOW) {
      processedMessages.delete(key);
    }
  }
}, MESSAGE_DEDUP_WINDOW);

// Função auxiliar para envio seguro de mensagens
async function safeSendText(client, phone, text) {
  try {
    await client.sendText(phone, text);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${phone}:`, error);
    return false;
  }
}

// Função para limpar o cliente de forma segura
async function cleanupClient() {
  if (globalClient) {
    try {
      console.log('Fechando cliente WhatsApp...');
      if (typeof globalClient.close === 'function') {
        await globalClient.close();
      }
      if (typeof globalClient.logout === 'function') {
        await globalClient.logout();
      }
      if (typeof globalClient.kill === 'function') {
        await globalClient.kill();
      }
      globalClient = null;
      isConnecting = false;
      console.log('Cliente fechado com sucesso');
    } catch (error) {
      console.error('Erro ao fechar cliente:', error);
      globalClient = null;
      isConnecting = false;
    }
  }
}

function sessionProbablyExists() {
  try {
    // Padrões comuns do wppconnect: tokens/<session>, tokens/<session>.data.json
    const candidates = [
      path.join(TOKENS_DIR, SESSION_NAME),
      path.join(TOKENS_DIR, `${SESSION_NAME}.data.json`),
      path.join(process.cwd(), 'tokens', SESSION_NAME),
      path.join(process.cwd(), 'tokens', `${SESSION_NAME}.data.json`),
    ];
    return candidates.some((p) => fs.existsSync(p));
  } catch {
    return false;
  }
}

function renderQrPage() {
  // Página simples que atualiza o QR e mostra status
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>WhatsApp QR</title>
      <style>
        body { font-family: Arial, sans-serif; background:#fff; margin: 24px; }
        .row { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start; }
        img { width: 360px; height: 360px; object-fit: contain; border:1px solid #ddd; }
        pre { background:#f7f7f7; padding:12px; border:1px solid #eee; }
      </style>
    </head>
    <body>
      <h2>Conectando ao WhatsApp...</h2>
      <p>Se houver sessão salva, o bot conecta sozinho. Se não houver, escaneie o QR abaixo.</p>
      <div class="row">
        <div>
          <img id="qr" src="/qrcode?ts=${Date.now()}" alt="QR code" />
          <div><small>Atualiza a cada 2s</small></div>
        </div>
        <div>
          <h3>Status</h3>
          <pre id="status">carregando...</pre>
        </div>
      </div>
      <script>
        function refreshQr(){
          const img = document.getElementById('qr');
          img.src = '/qrcode?ts=' + Date.now();
        }
        async function refreshStatus(){
          try {
            const r = await fetch('/status');
            const j = await r.json();
            document.getElementById('status').textContent = JSON.stringify(j, null, 2);
          } catch (e) {
            document.getElementById('status').textContent = String(e);
          }
        }
        setInterval(refreshQr, 2000);
        setInterval(refreshStatus, 2000);
        refreshStatus();
      </script>
    </body>
  </html>`;
}

async function connectWhatsapp({ interactive }) {
  // VERIFICAÇÃO SINGLETON
  if (globalClient) {
    return globalClient;
  }
  if (isConnecting) {
    throw new Error('Conexão já em andamento');
  }

  // Se não for interativo, só tenta se houver sessão salva
  if (!interactive && !sessionProbablyExists()) {
    throw new Error('Sem sessão salva; auto-start ignorado');
  }

  // Limita tentativas de reconexão
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    throw new Error('Muitas tentativas de conexão em andamento');
  }

  isConnecting = true;
  connectionAttempts++;

  // Reset contador após timeout
  setTimeout(() => {
    connectionAttempts = 0;
  }, 300000); // 5 minutos

  try {
    console.log(`Iniciando sessão WhatsApp (${SESSION_NAME})...`);

    const client = await Promise.race([
      wppconnect.create({
        session: SESSION_NAME,
        headless: 'new',
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: true,
        puppeteerOptions: puppeteerOptions,
        disableWelcome: true,
        updatesLog: false,
        autoClose: 0,
        catchQR: (base64Qr) => {
          // Em boot/restart não existe request HTTP pra responder.
          // A UI/monitoramento pode puxar /qrcode.
          try {
            lastQrAt = new Date();
            const matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) return;

            const imageBuffer = Buffer.from(matches[2], 'base64');
            sharp(imageBuffer)
              .resize({ width: 500, height: 500 })
              .toBuffer()
              .then((newImageBuffer) => {
                fs.writeFile('out.png', newImageBuffer, 'binary', function (err) {
                  if (err) console.error('Erro ao salvar QR code:', err);
                });
              })
              .catch((err) => console.error('Erro ao processar QR:', err));
          } catch (err) {
            console.error('Erro no catchQR:', err);
          }
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na criação do cliente')), CONNECTION_TIMEOUT)
      ),
    ]);

    globalClient = client;
    isConnecting = false;
    connectionAttempts = 0;

    console.log('Cliente WhatsApp criado com sucesso');

    client.onStateChange((state) => {
      console.log('Estado da conexão:', state);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
        console.log('Detectada desconexão, limpando cliente...');
        globalClient = null;
      }
    });

    await start(client);
    return client;
  } catch (error) {
    isConnecting = false;
    globalClient = null;
    console.error('Falha ao iniciar WhatsApp:', error);
    throw error;
  }
}

// Captura sinais de encerramento para limpeza adequada (importante para PM2)
process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando graciosamente...');
  await cleanupClient();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando graciosamente...');
  await cleanupClient();
  process.exit(0);
});


const app = express();
const puppeteerOptions = {
  headless: true, // Se false, o navegador será aberto em uma janela visível
  defaultViewport: null, // Permite configurar o tamanho da janela do navegador
  args: ['--no-sandbox', '--disable-setuid-sandbox'], // Argumentos adicionais para o Chrome/Chromium
  executablePath: '/root/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome' // Especifique o caminho do Chrome aqui
  //executablePath: '/root/.cache/puppeteer/chrome-headless-shell/linux-121.0.6167.85/chrome-headless-shell-linux64/chrome-headless-shell' // Especifique o caminho do Chrome aqui
};

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
    if (globalClient) {
      return res.status(200).send('Cliente WhatsApp já está rodando');
    }
    if (isConnecting) {
      return res.status(409).send('Já existe uma tentativa de conexão em andamento. Aguarde.');
    }

    // Responde imediatamente com uma página que mostra QR + status.
    // A conexão acontece em background.
    res.status(200).send(renderQrPage());
    connectWhatsapp({ interactive: true }).catch((err) => {
      console.error('Falha ao conectar via /run:', err);
    });
  } catch (error) {
    console.error("Erro ao iniciar via /run:", error);
    res.status(500).send("Erro ao iniciar WhatsApp: " + error.message);
  }
});
app.get('/env', (req, res) => {
  res.status(200).send(process.cwd())
})

// Novo endpoint para verificar status da conexão
app.get('/status', (req, res) => {
  const status = {
    connected: globalClient !== null,
    connecting: isConnecting,
    connectionAttempts: connectionAttempts,
    uptime: process.uptime(),
    lastQrAt
  };
  res.status(200).json(status);
})

// Novo endpoint para forçar desconexão (use com cuidado)
app.get('/disconnect', async (req, res) => {
  if (!globalClient) {
    return res.status(200).send('Nenhum cliente conectado');
  }
  await cleanupClient();
  res.status(200).send('Cliente desconectado com sucesso');
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
    try {
      // DEDUPLICAÇÃO: Previne processamento de mensagens duplicadas
      const messageKey = `${message.from}_${message.id}_${message.timestamp}`;
      if (processedMessages.has(messageKey)) {
        console.log('Mensagem duplicada ignorada:', messageKey);
        return;
      }
      processedMessages.set(messageKey, Date.now());

      const telefoneAtendente=process.env.TELEFONE_ATENDENTE;
      var chatId = message.chatId;
      var phone = message.from;
      var nome  = message.notifyName.split(' ')[0] ?? 'Usuário';
      var status = '';
      var id_cliente_banco = 0;
      // const jsonString = JSON.stringify(message, null, 2); // O segundo parâmetro é para formatação e o terceiro é o espaçamento de indentação

      // Caminho do arquivo onde os dados serão salvos
      // const arquivo = 'dados.json';
      // Escreve os dados JSON no arquivo
      //await fs.writeFileSync(arquivo, jsonString);
    if (phone != 'status@broadcast') {
      // Adiciona tratamento de erro para chamadas de serviço
      try {
        await service.getByPhone(phone)
          .then((data)=>{
            if (data){//se existir
              status = data.status;
              id_cliente_banco = data.id;
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
          .catch((error) => {
            console.error('Erro ao buscar status do cliente:', error);
            // Define status padrão em caso de erro
            status = type.BEM_VINDO;
          });
      } catch (error) {
        console.error('Erro na busca de status:', error);
        status = type.BEM_VINDO;
      }

        let opcaoNumero = parseInt(message.body)
        if (telefoneAtendente == phone) {
          if (!isNaN(message.body) && Number.isInteger(parseInt(message.body))) {
            service.updateStatus(message.body,type.BEM_VINDO).catch(err => 
              console.error('Erro ao atualizar status:', err)
            );
          }
        }

        else if (status == type.BEM_VINDO && message.body != '') {
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
          await safeSendText(client, telefoneAtendente, `O cliente ${nome}, de número *${tel}* e código *${id_cliente_banco}* está aguardando por atendimento!`)
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
                    await safeSendText(client, phone, mensagem_grande)
                  }else{
                    await safeSendText(client, phone, controller.mensagemResultado(data))
                  }

                  service.updateStatus(phone,type.CONFIRMACAO_NOVO_ATENDIMENTO)
                  await safeSendText(client, phone, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
                }
                else{
                  throw new Error("Opção inválida! A opcao vai até 10.")
                }
              })

              .catch(error => {
                safeSendText(client, message.from, "Opção inválida! Verifique novamente as opções a cima.")
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
          await safeSendText(client, message.from, "Opção inválida! Verifique novamente as opções a cima.")
        }
    }
    else {
      console.log("broadcast");
    }
    } catch (error) {
      // TRATAMENTO DE ERRO: Previne que erros em mensagens individuais derrubem o bot
      console.error('Erro ao processar mensagem:', error);
      console.error('Mensagem que causou o erro:', message);
      try {
        await safeSendText(client, message.from, "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.");
      } catch (sendError) {
        console.error('Erro ao enviar mensagem de erro:', sendError);
      }
    }
  }); 
}

module.exports = app;

// Auto-start no boot (PM2 restart) somente se existir sessão salva.
setImmediate(() => {
  if (!AUTO_START) {
    console.log('WPP_AUTOSTART=false; auto-start desabilitado');
    return;
  }
  if (!sessionProbablyExists()) {
    console.log('Nenhuma sessão salva encontrada; aguardando /run para gerar QR');
    return;
  }
  console.log('Sessão salva encontrada; conectando automaticamente...');
  connectWhatsapp({ interactive: false }).catch((err) => {
    console.error('Auto-start falhou:', err.message || err);
  });
});
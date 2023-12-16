const EnumStatus = {
    MENSAGEM_DATA: 1,
    MENSAGEM_HORARIO: 2,
    BUSCAR: 3
  };

  var status

function cancelarAtendimentoSeNaoResponder(client, chatId, message) {
    const tempoLimite = 5000; // 30 segundos em milissegundos
    setTimeout(() => {
      client.stopPhoneWatchdog(chatId)
        .then(() => {
          client.sendText(message.from, "Atendimento cancelado devido à falta de resposta do cliente.")
          status = EnumStatus.MENSAGEM_DATA
        })
        .catch((error) => {
          console.error('Erro ao cancelar o atendimento:', error);
        });
    }, tempoLimite);
  }

function start(client) {
    status = EnumStatus.MENSAGEM_DATA
    let dataEscolhida = null
    let horarioEscolhido = null
    client.onMessage((message) => {
        const chatId = message.chatId;
        console.log(chatId)
        
        let opcaoNumero = parseInt(message.body)

        if (status == EnumStatus.MENSAGEM_DATA && message.body == 'abc') {//message.body == 'abc'
            cancelarAtendimentoSeNaoResponder(client, chatId, message)
            status = EnumStatus.MENSAGEM_HORARIO
            client
            .sendText(message.from, mensagemData())

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.MENSAGEM_HORARIO)){ //valida se é um numero e se esta entre 1 e 10
            dataEscolhida = getData(opcaoNumero)            
            status = EnumStatus.BUSCAR

            mensagemHorario(dataEscolhida)
            .then(data => {
              client
                .sendText(message.from, data)
             })

             .catch(error => {
               client
               .sendText(message.from, "Infelizmente não conseguimos localizar o resultado. Contate o administrador. ")
               console.error('Erro ao obter dados:', error);
             })

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.BUSCAR)){
            getHorario(opcaoNumero, dataEscolhida)
              .then((horarioEscolhido) => {
                buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'))
                .then(data => {
                  client
                    .sendText(message.from, mensagemResultado(data))
                    status = EnumStatus.MENSAGEM_DATA
                 })
   
                 .catch(error => {
                   client
                   .sendText(message.from, "Infelizmente não conseguimos localizar o resultado. Contate o administrador. ")
                   console.error('Erro ao obter dados:', error);
                 })
              })
        } else{
          console.log("qualaer cosas")
        }
    });
  }
  
function mensagemData() {
    let mensagem = 'Olá, BANCA SÃO JOSÉ agradece seu contato.\n*Selecione uma data*\n'
    
    const today = new Date();
    for (let i = 1; i < 11; i++) {
        const previousDate = new Date(today);
        previousDate.setDate(today.getDate() - i);
        const formattedDate = `${(previousDate.getDate() + 1).toString().padStart(2, '0')}/${(previousDate.getMonth() + 1).toString().padStart(2, '0')}/${previousDate.getFullYear()}`;
        mensagem = mensagem + '\n' + i + ' - '+formattedDate
    }
    return mensagem
}

//retorna a data escolhida pelo cliente
function getData(opcao){
    let listaDatas = []
    const today = new Date();
    
    for (let i = 1; i < 11; i++) {
        const previousDate = new Date(today);
        previousDate.setDate(today.getDate() - i);
        let dia = (previousDate.getDate() + 1).toString().padStart(2, '0')
        let mes = (previousDate.getMonth() + 1).toString().padStart(2, '0')
        let ano = previousDate.getFullYear()
        const formattedDate = `${ano}-${mes}-${dia}`;
        listaDatas.push(formattedDate)
    }
    return listaDatas[opcao-1]

}

//retorna o horario escolhido
async function mensagemHorario(dataEscolhida, isMensagem = true){
  //validar se o dia é quarta ou sabado para poder mostra o horario da federal
  let mensagem = 'Certo, agora *selecione um horario*\n\n'
  let url = `https://gestaobsj.com.br/Server/Extracao.php?getHorariosByDate=true&data_extracao=${dataEscolhida}`
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Não foi possível obter os dados');
    }
    const data = await response.json();

    let contator = 1

    if (data.federal == true){
      mensagem = mensagem + '1 - FEDERAL\n'
      contator = 2
    }

    data.horarios.forEach((obj, i) => {
      mensagem = mensagem + (i+contator) + ' - ' + obj.hora_extracao + ' ' + obj.tipo_extracao + '\n'
    });

    if (isMensagem == true){
      return mensagem;
    }else{
      return data
    }

  } catch (error) {
    console.error('Erro:', error);
    throw error; // Propaga o erro para quem chamou a função
  }
}

async function getHorario(opcaoNumero, dataEscolhida){
  let data = await mensagemHorario(dataEscolhida, false)
  console.log(data)
  let horarios = []
  
  if (data.federal == true){
    horarios.push('FEDERAL')
  }

  data.horarios.forEach((obj) => {
    horarios.push(obj.hora_extracao)
  });

  return horarios[opcaoNumero-1]
}

async function buscarExtracao(dataEscolhida, horarioEscolhido, isFederal){
  let url = ''
  if (isFederal == true){
    url = `https://gestaobsj.com.br/Server/Extracao.php?getFederalByDate=true&data_extracao=${dataEscolhida}`
  }else{
    url = `https://gestaobsj.com.br/Server/Extracao.php?getByDateAndTime=true&data_extracao=${dataEscolhida}&horario_extracao=${horarioEscolhido}`
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Não foi possível obter os dados');
    }
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Erro:', error);
    throw error; // Propaga o erro para quem chamou a função
  }
}

function mensagemResultado(obj) {
  var animais = ["Avestruz", "Águia", "Burro", "Borboleta", "Cachorro", "Cabra", "Carneiro", "Camelo", "Cobra", "Coelho", "Cavalo", "Elefante", "Galo", "Gato",
      "Jacaré", "Leão", "Macaco", "Porco", "Pavão", "Peru", "Touro", "Tigre", "Urso", "Veado", "Vaca"];
  var arr = [Math.ceil((parseInt(obj._1_extracao.substr(2, 3)) == 0 ? 25 : parseInt(obj._1_extracao.substr(2, 3)) / 4)),
  Math.ceil((parseInt(obj._2_extracao.substr(2, 3)) == 0 ? 25 : parseInt(obj._2_extracao.substr(2, 3)) / 4)),
  Math.ceil((parseInt(obj._3_extracao.substr(2, 3)) == 0 ? 25 : parseInt(obj._3_extracao.substr(2, 3)) / 4)),
  Math.ceil((parseInt(obj._4_extracao.substr(2, 3)) == 0 ? 25 : parseInt(obj._4_extracao.substr(2, 3)) / 4)),
  Math.ceil((parseInt(obj._5_extracao.substr(2, 3)) == 0 ? 25 : parseInt(obj._5_extracao.substr(2, 3)) / 4))];

  var text = '*BANCA SÃO JOSÉ*\n*RESULTADO '
  +(obj.tipo_extracao=="FEDERAL"?obj.tipo_extracao:"DAS "+obj.hora_extracao.substr(0, 5))+
  '*\n*1º '+obj._1_extracao+'*```'+("          " + animais[arr[0] - 1].toUpperCase()).slice(-10)+ " " + ("00" + arr[0]).slice(-2)+'```'+
  '\n*2º '+obj._2_extracao+'*```'+("          " + animais[arr[1] - 1].toUpperCase()).slice(-10)+ " " + ("00" + arr[1]).slice(-2)+'```'+
  '\n*3º '+obj._3_extracao+'*```'+("          " + animais[arr[2] - 1].toUpperCase()).slice(-10)+ " " + ("00" + arr[2]).slice(-2)+'```'+
  '\n*4º '+obj._4_extracao+'*```'+("          " + animais[arr[3] - 1].toUpperCase()).slice(-10)+ " " + ("00" + arr[3]).slice(-2)+'```'+
  '\n*5º '+obj._5_extracao+'*```'+("          " + animais[arr[4] - 1].toUpperCase()).slice(-10)+ " " + ("00" + arr[4]).slice(-2)+'```'+
  '\n```     '+new Date(obj.data_extracao.replace('-', '/')).toLocaleDateString()+'     ```';
  
  return text;
  //window.open('https://api.whatsapp.com/send?text=' + window.encodeURIComponent(text), "_blank");

}

module.exports = {
    start,
    getData,
    getHorario
};
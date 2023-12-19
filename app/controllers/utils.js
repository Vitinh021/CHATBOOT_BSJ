const EnumStatus = {
    PRIMEIRA_MENSAGEM: 1,
    ATENDIMENTO_OU_DATA: 2,
    MENSAGEM_DATA: 3,
    MENSAGEM_HORARIO: 4,
    BUSCAR: 5,
    ATENDIMENTO_FUNCIONARIO: 6,
    CONFIRMACAO_NOVO_ATENDIMENTO: 7
  };

var status
let timeoutId

function start(client) {
    status = EnumStatus.PRIMEIRA_MENSAGEM
    let dataEscolhida = null
    
    client.onMessage(async (message) => {
        const chatId = message.chatId;

        timeoutAtendimento(client, chatId, message, 600000) //pelo caminho feliz, o atendimento tem 10 minutos
        
        let opcaoNumero = parseInt(message.body)

        if (status == EnumStatus.PRIMEIRA_MENSAGEM && message.body != '') {
          client.sendText(message.from, primeiraMesagem())
          status = EnumStatus.ATENDIMENTO_OU_DATA //mudar para status bem vindo

        }else if (status == EnumStatus.ATENDIMENTO_OU_DATA && message.body == '1') {
            timeoutAtendimento(client, chatId, message, 600000)
            status = EnumStatus.MENSAGEM_HORARIO
            client.sendText(message.from, mensagemData())

        }else if(status == EnumStatus.ATENDIMENTO_OU_DATA && message.body == '2'){
            timeoutAtendimento(client, chatId, message, 600000)
            status = EnumStatus.ATENDIMENTO_FUNCIONARIO
            client.sendText(message.from, 'Você agora está conversando com um atendente.\nCaso queira encerrar o atendimento, digite 0... ')

        }else if(status == EnumStatus.ATENDIMENTO_FUNCIONARIO && message.body=='0'){ //se quiser que o ciclo seja encerrado sempre que o usuário envie 0, tirar a validação do status da estrutura de condição
          timeoutAtendimento(client, chatId, message, 1000)

        }else if(status == EnumStatus.ATENDIMENTO_FUNCIONARIO && message.body != ''){
            timeoutAtendimento(client, chatId, message, 300000) //5 minutos
            //com isso, durante um atendimento com um funcionario, após n minutos da ultima mensagem enviada pelo cliente, o atendimento será finalizado

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.MENSAGEM_HORARIO)){ //valida se é um numero e se esta entre 1 e 10
            timeoutAtendimento(client, chatId, message, 300000) //5 minutos  
            dataEscolhida = getData(opcaoNumero)            
            status = EnumStatus.BUSCAR

            mensagemHorario(dataEscolhida)
            .then(data => {
              client.sendText(message.from, data)
             })

             /* .catch(error => {
               client.sendText(message.from, "Infelizmente não conseguimos localizar o resultado. Atendimento encerrado.")
               status=EnumStatus.PRIMEIRA_MENSAGEM
             }) 
             erro nunca ocorrerá*/

        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.BUSCAR)){
          timeoutAtendimento(client, chatId, message, 300000) //5 minutos
            getHorario(opcaoNumero, dataEscolhida)
              .then((horarioEscolhido) => {
                buscarExtracao(dataEscolhida, horarioEscolhido, (horarioEscolhido == 'FEDERAL'))
                .then(data => {
                    client.sendText(message.from, mensagemResultado(data))
                    status = EnumStatus.CONFIRMACAO_NOVO_ATENDIMENTO
                    client.sendText(message.from, 'Digite *1* para solicitar um novo resultado;\nDigite *2* para finalizar o atendimento.')
                    timeoutAtendimento(client, chatId, message, 120000) //o usuário tem dois minutos para decidir, após esse tempo o atendimento é encerrado
                 })
   
                 .catch(error => {
                   client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
                   timeoutAtendimento(client, chatId, message, 120000)
                   console.error('Erro ao obter dados:', error);
                 })
              })

        }else if(status==EnumStatus.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='1'){
          timeoutAtendimento(client, chatId, message, 600000)
          status = EnumStatus.MENSAGEM_HORARIO
          client.sendText(message.from, mensagemData())

        }else if(status==EnumStatus.CONFIRMACAO_NOVO_ATENDIMENTO && message.body=='2'){
          timeoutAtendimento(client, chatId, message, 1000)

        }else if(status!=EnumStatus.ATENDIMENTO_FUNCIONARIO){
          client.sendText(message.from, "Opção inválida! Verifique novamente as opções a cima.")
          timeoutAtendimento(client, chatId, message, 120000) //se após dois minutos de digitar uma opção inválida ele nao fizer nada, o atendimento é encerrado
          console.log("qualquer coisa")
        }
    });
  }
  
function mensagemData() {
    let mensagem = 'Para saber o resultado 👇🏻👇🏻\n*Selecione uma data:*\n'
    
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
  let mensagem = 'Certo, agora *selecione um horario*\n🍀BOA SORTE🍀\n'
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

function primeiraMesagem(){
  var text = 'Olá, BANCA SÃO JOSÉ agradece seu contato.\n\nDigite *1* para acessar as datas das extrações;\nDigite *2* para conversar com um de nossos atendentes.'
  return text
}

function timeoutAtendimento(client, chatId, message, tempoDuracao) {

  //dessa forma, o programa permite apenas uma execução do time out por vez. Util para casos em que a conversa será encerradas com timeouts diferentes 
  if (timeoutId){
    clearTimeout(timeoutId)
  }

  timeoutId = setTimeout(() => {
    client.stopPhoneWatchdog(chatId)
      .then(() => {
        client.sendText(message.from, "FICAMOS FELIZES EM ATENDER,\nAGRADECEMOS A PREFERÊNCIA. 😃")
        status = EnumStatus.PRIMEIRA_MENSAGEM
      })
      .catch((error) => {
        console.error('Erro ao cancelar o atendimento:', error);
      });
  }, tempoDuracao);
}

module.exports = {
    start,
    getData,
    getHorario
};
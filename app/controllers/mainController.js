//Mensage de boas vindas 
async function bemVindo(client, phone, nome){
  await client.sendText(phone,
    `Olá, ${nome}. BANCA SÃO JOSÉ agradece seu contato.\n\nDigite *1* para acessar as datas das extrações;\nDigite *2* para conversar com um de nossos atendentes.`
  )

  client.sendText(phone,
    `Caso queira encerrar o atendimento, *DIGITE 0* a qualquer momento... `
  )
}

//imprime as datas disponiveis para escolher o horario em seguida
function imprimirDatas(client, phone) {
    let text = 'Para saber o resultado 👇🏻👇🏻\n*Selecione uma data:*\n'
    
    const today = new Date();
    for (let i = 1; i < 11; i++) {
        const previousDate = new Date(today);
        previousDate.setDate(today.getDate() - i);
        const formattedDate = `${(previousDate.getDate() + 1).toString().padStart(2, '0')}/${(previousDate.getMonth() + 1).toString().padStart(2, '0')}/${previousDate.getFullYear()}`;
        text = text + '\n' + i + ' - '+ formattedDate
    }
    client.sendText(phone, text)
}

//inicia atendimento com o funcionario
function iniciaAtendimento(client, phone){
  client.sendText(phone, 'Você agora está conversando com um atendente.\nFaça seu pedido!')

  client.sendText(phone,
    `Caso queira encerrar o atendimento, *DIGITE 0* a qualquer momento... `
  )
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
async function imprimirHorario(client, phone, dataEscolhida, isMensagem = true){
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
        client.sendText(phone, mensagem)
    }else{
      return data
    }

  } catch (error) {
    console.error('Erro:', error);
    throw error; // Propaga o erro para quem chamou a função
  }
}

//retorna o horario escolhido pelo o cliente
async function getHorario(client, phone, opcaoNumero, dataEscolhida){
  let data = await imprimirHorario(client, phone, dataEscolhida, false)
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

//busca a extracao com base na data, hora e se é federal ou não
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

//imprime o resultado no formato desejado pela BSJ
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
}

function finalizarAtendimento(client, phone){
    client.sendText(phone, "FICAMOS FELIZES EM ATENDÊ-LO,\nAGRADECEMOS A PREFERÊNCIA. 😃")
}

//exporta funções
module.exports = {
  bemVindo,
  imprimirDatas,
  iniciaAtendimento,
  getData,
  imprimirHorario,
  getHorario,
  buscarExtracao,
  mensagemResultado,
  finalizarAtendimento
};
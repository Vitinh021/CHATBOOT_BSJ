//varivael de estado
//enumerador com os estados

const EnumStatus = {
    MENSAGEM_DATA: 1,
    MENSAGEM_HORARIO: 2,
    BUSCAR: 3
  };


function start(client) {
    var status = EnumStatus.MENSAGEM_DATA
    let dataEscolhida = null
    let horarioEscolhido = null
    client.onMessage((message) => {
        let opcaoNumero = parseInt(message.body)
        if (status == EnumStatus.MENSAGEM_DATA) {//message.body == 'abc'
            status = EnumStatus.MENSAGEM_HORARIO
            client
            .sendText(message.from, mensagemData())
            .then((result) => {
                //console.log('Result: ', result)
            })
            .catch((erro) => {
                //console.error("Erro misera: ", erro);
            });
        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.MENSAGEM_HORARIO)){ //valida se é um numero e se esta entre 1 e 10
            dataEscolhida = getData(opcaoNumero)
            status = EnumStatus.BUSCAR
            client
            .sendText(message.from, mensagemHorario())
            .then((result) => {
                //console.log('Result: ', result)
            })
            .catch((erro) => {
                //console.error("Erro misera: ", erro);
            });
        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10) && (status == EnumStatus.BUSCAR)){
            horarioEscolhido = getHorario(opcaoNumero)
            client
            .sendText(message.from, buscarExtracao(dataEscolhida, horarioEscolhido))
            .then((result) => {
                //console.log('Result: ', result)
            })
            .catch((erro) => {
                //console.error("Erro misera: ", erro);
            });
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
        const formattedDate = `${previousDate.getDate().toString().padStart(2, '0')}/${(previousDate.getMonth() + 1).toString().padStart(2, '0')}/${previousDate.getFullYear()}`;
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
        const formattedDate = `${previousDate.getDate().toString().padStart(2, '0')}/${(previousDate.getMonth() + 1).toString().padStart(2, '0')}/${previousDate.getFullYear()}`;
        listaDatas.push(formattedDate)
    }
    return listaDatas[opcao-1]
}

//retorna o horario escolhido
function mensagemHorario(){
    let mensagem = 'Certo, agora *selecione um horario*\n\n1 - 09:45 PARATODOS \n2 - 10:45 LOTEP \n3 - 11:00 LOCAL \n4 - 12:45 LOTEP \n5 - 14:40 LOCAL \n6 - 15:45 LOTEP \n7 - 18:10 LOTEP \n8 - 20:30 PARATODOS'
    return mensagem
}

function getHorario(opcaoNumero){
    const horarios = [
        '09:45:00',
        '10:45:00',
        '11:00:00',
        '12:45:00',
        '14:40:00',
        '15:45:00',
        '18:10:00',
        '20:30:00'
      ];
      return horarios[opcaoNumero-1]
}
//PAROU AQUI
function buscarExtracao(dataEscolhida, horarioEscolhido){
    fetch('https://api.exemplo.com/dados')
  .then(response => {
    if (!response.ok) {
      throw new Error('Não foi possível obter os dados');
    }
    return response.json(); // Retorna uma promise com os dados JSON
  })
  .then(data => {
    // Faça algo com os dados recebidos (data)
    console.log(data);
  })
  .catch(error => {
    // Trata qualquer erro ocorrido durante a requisição
    console.error('Erro:', error);
  });
}

  module.exports = {
    start,
    getData,
    getHorario
  };


//exeibirMenu() retorno
//tratarMensagem(mensagem) retorno


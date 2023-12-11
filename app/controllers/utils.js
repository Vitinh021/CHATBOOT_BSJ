
function start(client) {
    client.onMessage((message) => {
        let opcaoNumero = parseInt(message.body)
        if (message.body == 'abc') {
            client
            .sendText(message.from, getDatas(true))
            .then((result) => {
                console.log('Result: ', result)
            })
            .catch((erro) => {
                console.error("Erro misera: ", erro);
            });
        }else if ((opcaoNumero != NaN) && (opcaoNumero >= 1 && opcaoNumero <= 10)){ //valida se é um numero e se esta entre 1 e 10
            let dataEscolhida = getDatas(false, parseInt(message.body))
            client
            .sendText(message.from, "a data escolhida foi: " + dataEscolhida)
            .then((result) => {
                console.log('Result: ', result)
            })
            .catch((erro) => {
                console.error("Erro misera: ", erro);
            });
        }else{
          console.log("qualaer cosas")
        }
    });
  }

function getDatas(isMensagem, opcao = null) {
    let listaDatas = []
    let mensagem = 'Olá, BANCA SÃO JOSÉ agradece seu contato.\n*Selecione uma data*\n'
    const today = new Date();
  
    for (let i = 1; i < 11; i++) {
        const previousDate = new Date(today);
        previousDate.setDate(today.getDate() - i);
    
        const formattedDate = `${previousDate.getDate().toString().padStart(2, '0')}/${(previousDate.getMonth() + 1).toString().padStart(2, '0')}/${previousDate.getFullYear()}`;
      
        listaDatas.push(formattedDate)
        mensagem = mensagem + '\n' + i + ' - '+formattedDate
    
    }

    if(isMensagem){
        return mensagem
    }else{
        console.log(listaDatas)
        return listaDatas[opcao-1]
    }
  }


  module.exports = {
    start,
    getDatas
  };


//exeibirMenu() retorno
//tratarMensagem(mensagem) retorno


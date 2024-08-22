const type = require('../controllers/types');

async function createStatus(phone){
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = ('0' + (agora.getMonth() + 1)).slice(-2);
  const dia = ('0' + agora.getDate()).slice(-2);
  const horas = ('0' + agora.getHours()).slice(-2);
  const minutos = ('0' + agora.getMinutes()).slice(-2);
  const segundos = ('0' + agora.getSeconds()).slice(-2);
  const dataFormatada = `${ano}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;

  const formData = new FormData();
  formData.append('phone', phone);
  formData.append('data_hora', dataFormatada);
  formData.append('status', type.BEM_VINDO);
  formData.append('createStatus', true);

  const url = 'https://gestaobsj.com.br/Server/status.php';

  const options = {
    method: 'POST',
    body: formData
  };

  fetch(url, options)
    .then(response => {
      response.json().then(res =>{
        console.log(res)
      });
    })
    .catch(error => {
      console.error('Erro:', error);
    });
}   

//
async function getByPhone(phone){
  let url = 'https://gestaobsj.com.br/Server/status.php?getByPhone=true&phone='+phone
  return fetch(url)
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }
    return response.json();
  })
  .then(data => {
    return data;
  })
  .catch(error => {
    console.error('Error:', error);
  });
}
  
//
async function updateStatus(phone, status){

  let dataFormatada = '';
  const formData = new FormData();
  if (status == type.BEM_VINDO){
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = ('0' + (agora.getMonth() + 1)).slice(-2);
    const dia = ('0' + agora.getDate()).slice(-2);
    const horas = ('0' + agora.getHours()).slice(-2);
    const minutos = ('0' + agora.getMinutes()).slice(-2);
    const segundos = ('0' + agora.getSeconds()).slice(-2);
    dataFormatada = `${ano}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
    formData.append('data_hora', dataFormatada);
  }

  formData.append('phone', phone);
  formData.append('status', status);
  formData.append('updateStatus', true);

  const url = 'https://gestaobsj.com.br/Server/status.php';

  const options = {
    method: 'POST',
    body: formData
  };

  await fetch(url, options)
    .then(response => {
      response.json().then(res =>{
        console.log(res)
      });
    })
    .catch(error => {
      console.error('Erro:', error);
    });
}
  
//
async function deleteStatus(phone){
    //deletar
}
      
//exporta funções
module.exports = {
    createStatus,
    getByPhone,
    updateStatus,
    deleteStatus
  };
const mysql = require('mysql');

// Configuração do banco de dados MySQL
const dbConfig = {
  host: 'seu_host_do_mysql',
  user: 'seu_usuario_do_mysql',
  password: 'sua_senha_do_mysql',
  database: 'seu_banco_de_dados',
};

// Criação da conexão com o banco de dados
const connection = mysql.createConnection(dbConfig);

// Conectar ao banco de dados
connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    throw err;
  }
  console.log('Conectado ao banco de dados MySQL!');
});

module.exports = connection;

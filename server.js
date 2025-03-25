import "dotenv/config";
import app from "./src/app.js";
//import cadastrarProdutos from "./src/script_chat_bot/teste.js/cadastrarProdutos.js";

//cadastrarProdutos();
const porta = 3333
////teste de conexão
app.listen(porta,'0.0.0.0', ()=>{
    console.log(`Servidor rodando na porta ${porta}`)
});


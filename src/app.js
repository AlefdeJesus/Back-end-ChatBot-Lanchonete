import express from 'express';
import client from './script_chat_bot/scriptChatBot.js';
import conectarDba from './config/conectDB.js';
import routes from './routes/index.js';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Resolve corretamente o __dirname no ES6 (já que __dirname não está disponível diretamente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const corsSites = {
    origin: "*",
}

client.initialize();
const app = express();
app.use(cors(corsSites));

// Define a pasta 'public' como estática para servir arquivos publicamente
app.use('/public', express.static(path.join(__dirname, 'public')));

//app.use('/api', routes);
routes(app);
const conexao = await conectarDba();


conexao.on("error", (erro)=>{
    console.error("Erro ao conectar banco de dados: ", erro);
});
conexao.once("open", ()=>{
    console.log("Banco de dados conectado *_*")
});



export default app;
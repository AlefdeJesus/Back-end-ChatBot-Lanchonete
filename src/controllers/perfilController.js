import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import deslogar from "../script_chat_bot/scriptChatBot.js";
//import msgDeConectado from "../script_chat_bot/scriptChatBot.js";

// Resolve corretamente o __dirname no ES6 (já que __dirname não está disponível diretamente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerfilController{
    
    // Método para gerar um QR Code
    static async gerarQRCode(req, res) {
        try {
         //client.initialize();
         const qrFilePath = path.join(__dirname, '../script_chat_bot/public', 'qrcode.png');
         const msgConectado = path.join(__dirname, '../script_chat_bot/public', 'connected.jpg');
         // Verifica se o arquivo de QR Code existe e envia
        fs.access(qrFilePath, fs.constants.F_OK, (err) => {
            if(err){
               // console.log('Qrcode não encontrado. você está conectado' + err);

                fs.access(msgConectado, fs.constants.F_OK, (errAlt) => {
                    if(errAlt){
                       // console.log('Imagem de conectado não encontrada');
                        res.status(404).json({message: 'Nenhuma imagem encontrada'});
                    }
                    res.sendFile(msgConectado);
                });
            }else{
                res.sendFile(qrFilePath);
            }
        });
        } catch (error) {
         console.log('Erro ao gerar QR code:', error);
         res.status(500).json({message: 'Erro ao gerar QR code', error: error.message})
        }
     
     }
     //função para deslogar whatszap
     static async deslogarWhatszap(req, res) {
      try {
         deslogar.deslogar();
         //agora ao deslogar apaga a imagem de qrcode
         const qrFilePath = path.join(__dirname, '../script_chat_bot/public', 'qrcode.png');
         fs.unlink(qrFilePath, (err) => {
             if (err) {
                // console.error('Erro ao apagar imagem de qrcode:', err);
                 return;
             }
             console.log('Imagem de qrcode apagada com sucesso');
         });
         res.status(200).json({ message: 'Deslogado com sucesso' });
 
      } catch (error) {
         res.status(500).json({message: 'Erro ao deslogar', error: error.message})
      }
         
    }
}

export default PerfilController;
import express from 'express';
import PerfilController from '../controllers/perfilController.js';

const routes = express.Router();

routes.get('/qrcode', PerfilController.gerarQRCode);
routes.post('/desconectar', PerfilController.deslogarWhatszap);


export default routes;
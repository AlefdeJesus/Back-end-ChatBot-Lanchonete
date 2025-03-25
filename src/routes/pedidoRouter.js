import express from 'express';
import PedidoController from '../controllers/pedidoController.js';

const routes = express.Router();

routes.get('/pedido', PedidoController.listarPedidos);
routes.get('/pedido/:id', PedidoController.listarPedidoPorId);
routes.put('/pedido/:id', PedidoController.atualizarPedido);



export default routes;
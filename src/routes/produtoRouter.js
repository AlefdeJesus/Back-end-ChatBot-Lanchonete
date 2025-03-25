import express from 'express';
import ProdutoController from '../controllers/produtoController.js';    

const routes = express.Router();

routes.post('/produto', ProdutoController.criarProduto);
routes.get('/produto', ProdutoController.listarProdutos);
routes.get('/produto/:id', ProdutoController.listarProdutoPorId);
routes.put('/produto/:id', ProdutoController.atualizarProduto);
routes.delete('/produto/:id', ProdutoController.deletarProduto);
 



export default routes;
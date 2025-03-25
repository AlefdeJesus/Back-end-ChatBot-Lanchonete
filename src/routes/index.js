import express from 'express';
import pedido from './pedidoRouter.js';
import produto from './produtoRouter.js';
import perfil from './perfilRouter.js';

const routes = (app)=>{
    app.route("/").get((req,res)=> res.status(200).send("API funcionando"));
    app.use(express.json(), pedido, produto, perfil);
}

export default routes;
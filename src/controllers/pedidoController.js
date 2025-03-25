import pedido from '../models/Pedido.js';
import Cliente from '../models/Cliente.js';


class PedidoControllers{
    static async listarPedidos(req,res){
        try {
            // Buscar todos os pedidos
            const pedidos = await pedido.find();
    
            // Iterar sobre os pedidos e buscar o cliente correspondente
            const pedidosComNomeCliente = await Promise.all(pedidos.map(async (pedido) => {
                // Buscar o cliente pelo número de telefone
                const cliente = await Cliente.findOne({ numero: pedido.cliente });
                const contatoFormatado = pedido.cliente.replace(/@c\.us$/, '').slice(4);
    
                // Retornar os dados do pedido com o nome do cliente
                return {
                    _id: pedido._id,
                    contatoDoCliente: contatoFormatado,
                    cliente: cliente ? cliente.nome : 'Cliente desconhecido', // Fallback se o cliente não for encontrado
                    itens: pedido.itens,
                    totalDoPedido: pedido.totalDoPedido,
                    status: pedido.status,
                    endereco: pedido.endereco,
                    data: pedido.data,
                    observacao: pedido.observacao,
                    formaDepagamento: pedido.formaDepagamento,
                    trocoPara: pedido.trocoPara
                };
            }));
    
            // Enviar a resposta com os pedidos e o nome do cliente
            res.json(pedidosComNomeCliente);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            res.status(500).send('Erro ao buscar pedidos');
        }
    };


static async listarPedidoPorId(req,res){
    const {id} = req.params;
    const listarPedidoPorId = await pedido.findById(id);
    try {
        res.status(200).json(listarPedidoPorId);
    } catch (error) {
        console.log('Error: ', error);
        res.status(500).json({message: `${error.message}: Erro ao listar pedido`});
    }
};
    static async atualizarPedido(req,res){
        const {id} = req.params;
        const {status} = req.body;
        try {
            const atualizarPedido = await pedido.findByIdAndUpdate(id, {status}, {new: true});
            res.status(200).json(atualizarPedido);
        } catch (error) {
            console.log('Error: ', error);
            res.status(500).json({message: `${error.message}: Erro ao atualizar pedido`});
        }
    };
}

export default PedidoControllers;   
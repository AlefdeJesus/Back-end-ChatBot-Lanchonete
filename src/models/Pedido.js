import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema({
    cliente: String,          // ID ou nome do cliente
    itens: [{
        produto: String,      // Nome ou descrição do produto
        quantidade: Number,   // Quantidade do produto
        preco: Number         // Preço total do produto (quantidade * preço unitário)
    }],
    totalDoPedido: Number,    // Preço total do pedido
    status: String, 
    endereco: {type: String, required: true},          // Status do pedido (Ex: Pendente, Concluído)
    data: { type: Date, default: Date.now },  // Data do pedido
    observacao: {type: String, required: true},
    formaDepagamento: {type: String, required: true}, // Forma de pagamento do pedido
    trocoPara: {type: Number, required: true}
});

const Pedido = mongoose.model('Pedido', PedidoSchema);

export default Pedido;

import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import Pedido from '../models/Pedido.js';
import Produto from '../models/Produto.js';
import Cliente from '../models/Cliente.js'; // Importa o modelo Cliente

const { Client, LocalAuth } = pkg;

// Estado dos pedidos dos usuários
let orderState = {};

// Inicializa o cliente do WhatsApp com autenticação local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true }); // Exibe o QR code no terminal
});

client.on('ready', () => {
    console.log('Bot está pronto para uso!');
});

// Função para buscar produtos do banco de dados e organizá-los por categoria
async function getProdutosPorCategoria() {
    try {
        const produtos = await Produto.find({}); // Busca todos os produtos do banco de dados
        const produtosPorCategoria = {};

        // Organiza os produtos por categoria
        produtos.forEach(produto => {
            if (!produtosPorCategoria[produto.categoria]) {
                produtosPorCategoria[produto.categoria] = [];
            }
            produtosPorCategoria[produto.categoria].push(produto);
        });

        return produtosPorCategoria;
    } catch (error) {
        console.error('Erro ao buscar produtos do banco de dados:', error);
        return {};
    }
}

// Evento de mensagem recebida
client.on('message', async (message) => {
    const from = message.from;

    // Inicializa o estado do pedido se não existir
    if (!orderState[from]) {
        orderState[from] = { step: 0, items: [] };
    }

    const currentState = orderState[from];
    const produtosPorCategoria = await getProdutosPorCategoria(); // Busca os produtos organizados por categoria

    // Verifica se o cliente já tem um nome salvo
    let cliente = await Cliente.findOne({ numero: from });
    let saudacao = 'Olá! Bem-vindo ao nosso estabelecimento! Por favor, escolha o número do que você gostaria de pedir:\n\n';

    if (cliente && cliente.nome) {
        saudacao = `Olá *${cliente.nome}*! Bem-vindo ao nosso estabelecimento! Por favor, escolha o número do que você gostaria de pedir:\n\n`;
    }

    // Monta a mensagem com as categorias e produtos
    let mensagemProdutos = saudacao;
    let contador = 1;

    for (const categoria in produtosPorCategoria) {
        mensagemProdutos += `*${categoria}:*\n`; // Exibe o nome da categoria com um emoji

        produtosPorCategoria[categoria].forEach(produto => {
            let precoSemFormat = Number(produto.preco).toFixed(2).replace('.', ',');
            let precoFormatado = precoSemFormat.toLocaleString('pt-br', { minimumFractionDigits: 2 });
            // Verifica se o preço é um número válido, senão exibe "Preço não disponível"
            const preco = typeof produto.preco === 'number' ? produto.preco.toFixed(2) : 'Preço não disponível';
            mensagemProdutos += `${contador}. ${produto.nome} - ${produto.descricao} *(R$ ${precoFormatado})*\n`;
            contador++;
        });

        mensagemProdutos += '\n'; // Adiciona uma linha em branco entre as categorias
    }

    const formatItems = (items) => {
        return items.map((item, index) => {
            const produtoNome = item.produto;
            let precoSemFormatItem = Number(item.preco).toFixed(2).replace('.', ',');
            let precoFormatadoItem = precoSemFormatItem.toLocaleString('pt-br', { minimumFractionDigits: 2 });
            return `*${index + 1}* - ${item.quantidade} x ${produtoNome} - R$${precoFormatadoItem}`;
        }).join('\n');
    };

// Função para buscar pedidos pendentes do cliente
async function buscarPedidosPendentes(clienteNumero) {
    try {
        const pedidos = await Pedido.find({ cliente: clienteNumero, status: 'Pendente' });
        return pedidos;
    } catch (error) {
        console.error('Erro ao buscar pedidos do cliente:', error);
        return [];
    }
}

   ////// // Controle de fluxo do bot com base no passo atual////////////////////////////////////////////////
    switch (currentState.step) {
        case 0:
            client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
            currentState.step = 1;
            break;

            case 1:
                if (message.body === '1') {
                    // Envia a lista de produtos por categoria para iniciar um novo pedido
                    client.sendMessage(from, mensagemProdutos); 
                    currentState.step = 2;
                } else if (message.body === '2') {
                    // Busca os pedidos pendentes e permite alterar ou cancelar
                    const pedidosPendentes = await buscarPedidosPendentes(from);  // Função para buscar pedidos no banco
                    
                    if (pedidosPendentes.length === 0) {
                        // Se não houver pedidos pendentes, exibe a mensagem
                        client.sendMessage(from, 'Você não possui pedidos pendentes.\n1️⃣ - Voltar para o menu inicial');
                        currentState.step = 0;  // Retorna ao menu inicial
                    } else {
                        // Mostra os pedidos pendentes com opções de alterar ou cancelar
                        let mensagemPedidos = '*Seus pedidos pendentes:*\n*DIGITE 0️⃣ PARA VOLTAR AO MENU INICIAL!*\n\n';
                        pedidosPendentes.forEach((pedido, index) => {
                            
                            let itensResumo = pedido.itens.map(item => `${item.quantidade}x ${item.produto} - R$${item.preco.toFixed(2).replace('.', ',')}`).join('\n');
                           
                            mensagemPedidos += `*Pedido ID ${index + 1}:*\n${itensResumo}\n*Total: R$${pedido.totalDoPedido.toFixed(2).replace('.', ',')}*\n*Status: ${pedido.status}*\n\n`;
                            mensagemPedidos += `Responda com:\n1️⃣ - Alterar Pedido ${index + 1}\n2️⃣ - Cancelar Pedido ${index + 1}\n\n`;
                            mensagemPedidos += '➖➖➖➖➖➖➖➖➖➖\n';
                        });
        
                        client.sendMessage(from, mensagemPedidos);
                        currentState.step = 'escolher_pedido'; // Define o estado para escolher o pedido
                    }
                } else {
                    client.sendMessage(from, 'Opção inválida. Por favor, escolha um número válido.');
                }
                break;

        case 2:
            const selectedProduct = Object.values(produtosPorCategoria).flat()[parseInt(message.body) - 1];
            if (selectedProduct) {
                currentState.currentItem = selectedProduct;
                client.sendMessage(from, `Quantos *${selectedProduct.nome}(s)* você gostaria de pedir?\nEx: 2`);
                currentState.step = 3;
            } else {
                client.sendMessage(from, 'Opção inválida. Por favor, escolha um número válido.');
            }
            break;

        case 3:
            const quantity = parseInt(message.body);
            if (!isNaN(quantity) && quantity > 0) {
                const produtoNome = currentState.currentItem.nome;
                const precoTotal = currentState.currentItem.preco * quantity;

                currentState.items.push({
                    produto: produtoNome,
                    item: currentState.currentItem,
                    quantidade: quantity,
                    preco: precoTotal
                });

                let orderSummary = '*Você pediu:*\n';
                currentState.items.forEach((item, index) => {
                    orderSummary += `*${index + 1}* _- ${item.quantidade} x ${item.produto} - R$${(item.preco).toFixed(2)}_\n`;
                });

                client.sendMessage(from, `${orderSummary}\nResponda:\n1️⃣ - Adicionar mais itens\n2️⃣ - Finalizar Pedido\n3️⃣ - Alterar pedido`);
                currentState.step = 4;
            } else {
                client.sendMessage(from, 'Quantidade inválida. Por favor, insira um número válido.');
            }
            break;

        case 4:
            if (message.body === '1') {
                client.sendMessage(from, mensagemProdutos); // Reenvia a lista de produtos por categoria
                currentState.step = 2;
            } else if (message.body === '2') {
                let orderSummary = '*Resumo do seu pedido:*\n';
                let total = 0;
                const itensParaSalvar = currentState.items.map(item => {
                    total += item.preco;
                    return {
                        produto: item.produto,
                        quantidade: item.quantidade,
                        preco: item.preco
                    };
                });

                orderSummary += formatItems(itensParaSalvar);

                const objDadospedido = {
                    cliente: from,
                    itens: itensParaSalvar,
                    totalDoPedido: total,
                    endereco: 'Endereço a ser informado',
                    status: 'Pendente',
                    data: Date.now(),
                    formaDepagamento: '*'
                };

                try {
                    await Pedido.create(objDadospedido);//ADICIONA PEDIDO AO BANCO DE DADOS

                    client.sendMessage(from, '*Favor informar o endereço de entrega:* \n_Ex: Rua Santo Antonio, Número 110, Bairro Jardins_');
                    client.sendMessage(from, `${orderSummary}\n\n*Total:* R$${total.toFixed(2)}  💸`);
                    currentState.step = 6;
                } catch (error) {
                    console.error('Erro ao salvar pedido:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao salvar seu pedido. Por favor, tente novamente.');
                }
            } else if (message.body === '3') {
                let orderSummary = '*Seu pedido atual:*\n';
                orderSummary += formatItems(currentState.items);

                client.sendMessage(from, `${orderSummary}\n*Digite o número do item que deseja remover*.`);
                currentState.step = 5;
            } else {
                client.sendMessage(from, 'Opção inválida. Por favor, escolha ⿡ para adicionar mais itens, ⿢ para finalizar ou ⿣ para alterar o pedido.');
            }
            break;

        case 5:
            const indexToRemove = parseInt(message.body) - 1;

            if (currentState.items[indexToRemove]) {
                currentState.items.splice(indexToRemove, 1);

                if (currentState.items.length > 0) {
                    let orderSummary = '*Seu pedido atualizado:*\n';
                    orderSummary += formatItems(currentState.items);

                    client.sendMessage(from, `${orderSummary}\nResponda:\n1️⃣ - Adicionar mais produtos\n2️⃣ - Finalizar Pedido`);
                    currentState.step = 4;
                } else {
                    client.sendMessage(from, 'Seu pedido está vazio. Digite 1️⃣ para voltar a fazer o pedido.\n\n', mensagemProdutos);
                    currentState.step = 2;
                }
            } else {
                client.sendMessage(from, 'Item inválido. Por favor, escolha um número válido.');
            }
            break;

        case 6:
            const endereco = message.body.trim();

            if (endereco && endereco.length >= 10) {
                currentState.endereco = endereco;

               /* const objDadospedido = {
                    cliente: from,
                    itens: currentState.items,
                    totalDoPedido: currentState.items.reduce((acc, item) => acc + item.preco, 0),
                    status: 'Pendente',
                    endereco: currentState.endereco,
                    data: Date.now(),
                    formaDepagamento: '*'
                };*/

                try {
                    const pedidoExistente = await Pedido.findOne({ cliente: from});
                
                    pedidoExistente.endereco = currentState.endereco;
                        await pedidoExistente.save();
                 
                    client.sendMessage(from, `*Favor informar seu nome:*`);
                    currentState.step = 7;
                } catch (error) {
                    console.error('Erro ao salvar pedido:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao salvar seu pedido. Por favor, tente novamente.');
                }
            } else {
                client.sendMessage(from, 'Por favor, insira um endereço válido para a entrega, seu endereço está muito curto.');
            }
            break;
        case 7:
            const nome = message.body.trim();

            if (nome && nome.length >= 3) {
                try {
                    await Cliente.findOneAndUpdate({ numero: from }, { nome: nome }, { upsert: true });
                    client.sendMessage(from, 'Qual sera a forma de pagamento? \n\n1️⃣ - Dinheiro\n2️⃣ - Cartão\n3️⃣ - Pix');
                    currentState.step = 8;
                
                } catch (error) {
                    console.error('Erro ao salvar nome do cliente:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao salvar seu nome. Por favor, tente novamente.');
                }
            } else {
                client.sendMessage(from, 'Por favor, insira um nome válido.');
            }
            break;

            case 8:
                let formaPagamentoTexto;
                let nomeCliente;

                try {
                    // Busca o nome do cliente no banco de dados
                    const cliente = await Cliente.findOne({ numero: from });
                    nomeCliente = cliente.nome;

                    if (message.body.trim() === '1') {
                        await Pedido.findOneAndUpdate({ cliente: from }, { formaDepagamento: 'Dinheiro' });
                        formaPagamentoTexto = 'Dinheiro';
                    } else if (message.body.trim() === '2') {
                        await Pedido.findOneAndUpdate({ cliente: from }, { formaDepagamento: 'Cartão' });
                        formaPagamentoTexto = 'Cartão';
                    } else if (message.body.trim() === '3') {
                        await Pedido.findOneAndUpdate({ cliente: from }, { formaDepagamento: 'Pix' });
                        formaPagamentoTexto = 'Pix';
                    } else {
                        client.sendMessage(from, 'Forma de pagamento inválida. Por favor, escolha uma forma de pagamento válida.');
                        return;
                    }

                    client.sendMessage(from, `Obrigado, *${nomeCliente.toUpperCase()}*! Seu pedido foi registrado com sucesso.\n\n*Nome:* ${nomeCliente.toUpperCase()}\n*Endereço:* ${currentState.endereco.toUpperCase()}\n*Total:* R$${currentState.items.reduce((acc, item) => acc + item.preco, 0).toFixed(2)}\n*Forma de Pagamento:* ${formaPagamentoTexto.toUpperCase()}\n\nTempo para entrega: 40 minutos 🕥\n\nObrigado por escolher a Tudo Lanches! 😊`);

                    // Limpa o estado do pedido
                    delete orderState[from];
                } catch (error) {
                    console.error('Erro ao finalizar pedido:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao registrar seu pedido. Por favor, tente novamente.');
                }
                break;

        case 'escolher_pedido':
            if(message.body === '0'){
                client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
                currentState.step = 1;
            }else{
                const pedidoEscolhidoIndex = parseInt(message.body) - 1; // O cliente escolhe o número do pedido
                const pedidosPendentes = await buscarPedidosPendentes(from); // Obter pedidos pendentes

                if (!pedidosPendentes || pedidosPendentes.length === 0) {
                    client.sendMessage(from, 'Você não tem pedidos pendentes.');
                    break;
                }

                const pedidoEscolhido = pedidosPendentes[pedidoEscolhidoIndex];

                if (!pedidoEscolhido) {
                    client.sendMessage(from, 'Pedido inválido. Escolha um pedido ID válido.');
                    break;
                }

                if (pedidoEscolhido.status === 'Em Preparo') {
                    client.sendMessage(from, 'Este pedido já está em preparo e não pode ser alterado ou cancelado.');
                } else {
                    client.sendMessage(from, `*DIGITE 0️⃣ PARA VOLTAR AO MENU INICIAL!*\n\nVocê escolheu o *Pedido ${pedidoEscolhidoIndex + 1}*.\n1️⃣ - Alterar Pedido\n2️⃣ - Cancelar Pedido`);
                    currentState.step = 'alterar_ou_cancelar'; // Define o próximo estado
                    currentState.pedidoAtual = pedidoEscolhido; // Salva o pedido atual para futuras ações
                }
            }	
            break;

    case 'alterar_ou_cancelar':
        if(message.body === '0'){
            client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
            currentState.step = 1;
        }
        if (message.body === '1') { // Alterar Pedido
            client.sendMessage(from, 'O que você gostaria de alterar?\n1️⃣ - Adicionar itens\n2️⃣ - Remover itens');
            currentState.step = 'escolher_alteracao'; // Passa para a etapa de alteração
        } else if (message.body === '2') { // Cancelar Pedido
            try {
                await Pedido.findByIdAndDelete(currentState.pedidoAtual._id); // Remove o pedido do banco de dados
                client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
                client.sendMessage(from, 'Seu pedido foi cancelado com sucesso.');
                currentState.step = 1;
                
            } catch (error) {
                console.error('Erro ao cancelar pedido:', error);
                client.sendMessage(from, 'Ocorreu um erro ao cancelar seu pedido. Tente novamente.');
            }
    }
    break;

        case 'escolher_alteracao':
            if(message.body === '0'){
                client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
                currentState.step = 1;
            }
            if (message.body === '1') { // Adicionar Itens
                client.sendMessage(from, mensagemProdutos); // Mostra os produtos novamente
                currentState.step = 'adicionar_item_pedido'; //adiciona itens ao pedido que já foi feito
            } else if (message.body === '2') { // Remover Itens
                let itensResumo = currentState.pedidoAtual.itens.map((item, index) => `*${index + 1}* - ${item.quantidade}x ${item.produto}`).join('\n');
                if(itensResumo === '') {
                    client.sendMessage(from, 'Seu pedido está vazio. O que você gostaria de fazer?\n1️⃣ - Adicionar itens\n2️⃣ - Cancelar pedido');
                    currentState.step = 'adicionar_ou_cancelar';
                }else{
                client.sendMessage(from, `Escolha o número do item que deseja remover:\n${itensResumo}`);
                console.log('itensResumo:', itensResumo);
                currentState.step = 'remover_item';
                }
            }
            break;

            case 'remover_item':
                const indexRemover = parseInt(message.body) - 1;
                if (currentState.pedidoAtual.itens[indexRemover]) {
                    // Remove o item do pedido
                    currentState.pedidoAtual.itens.splice(indexRemover, 1); 
                    
                    // Recalcular o valor total após a remoção do item
                    const novoValorTotal = currentState.pedidoAtual.itens.reduce((total, item) => total + item.preco, 0);
                    currentState.pedidoAtual.valorTotal = novoValorTotal; // Atualiza o valor total no estado atual do pedido
            
                    try {
                        // Atualiza o pedido no banco de dados com os itens e o novo valor total
                        await Pedido.findByIdAndUpdate(currentState.pedidoAtual._id, { 
                            itens: currentState.pedidoAtual.itens,
                            totalDoPedido: novoValorTotal
                        });
            
                        // Verifica se o pedido ficou vazio
                        if (currentState.pedidoAtual.itens.length === 0) {
                            client.sendMessage(from, 'Deseja adicionar novos itens ou cancelar o pedido?\n1️⃣ - Adicionar Itens\n2️⃣ - Cancelar Pedido');
                            client.sendMessage(from, 'Todos os itens foram removidos do seu pedido.');
                            currentState.step = 'adicionar_ou_cancelar'; // Novo estado para adicionar ou cancelar
                        } else {
                            client.sendMessage(from, `Item removido com sucesso. O valor total do seu pedido agora é R$ ${novoValorTotal.toFixed(2)}.\nO que deseja fazer a seguir?\n1️⃣ - Remover mais itens\n2️⃣ - Finalizar alterações`);
                            currentState.step = 'remover_ou_finalizar'; // Novo estado para remover ou finalizar
                        }
                    } catch (error) {
                        console.error('Erro ao atualizar pedido:', error);
                        client.sendMessage(from, 'Ocorreu um erro ao atualizar seu pedido. Tente novamente.');
                    }
                } else {
                    client.sendMessage(from, 'Item inválido. Por favor, escolha um número válido.');
                }
                break;
            
            case 'adicionar_ou_cancelar':
                if (message.body === '1') { // Adicionar Itens
                    client.sendMessage(from, mensagemProdutos); // Mostra a lista de produtos
                    currentState.step = 'adicionar_item_pedido'; // Volta para a etapa de adicionar itens
                } else if (message.body === '2') { // Cancelar Pedido
                    try {
                        /////////////////**************////////////////////////////
                        await Pedido.findByIdAndDelete(currentState.pedidoAtual._id); // Cancela o pedido removendo-o do 
                        client.sendMessage(from, `O que você gostaria de fazer agora?\n\n1️⃣ - Fazer um novo pedido\n2️⃣ - Ver seus pedidos`);
                        client.sendMessage(from, 'Seu pedido foi cancelado com sucesso.');
                        currentState.step = 1; // Volta ao menu principal
                    } catch (error) {
                        console.error('Erro ao cancelar pedido:', error);
                        client.sendMessage(from, 'Ocorreu um erro ao cancelar seu pedido. Tente novamente.');
                    }
                } else {
                    client.sendMessage(from, 'Opção inválida. Por favor, escolha 1 para adicionar itens ou 2 para cancelar o pedido.');
                }
                break;
            
                case 'adicionar_item_pedido':
                    try {
                        // Busca todos os produtos do banco de dados
                        const listaDeProdutos = await Produto.find({});
                        const itemEscolhidoIndex = parseInt(message.body) - 1;
                        const itemEscolhido = listaDeProdutos[itemEscolhidoIndex];
                
                        if (itemEscolhido) {
                            const quantidade = 1; // Aqui você pode implementar a lógica para escolher a quantidade de itens
                            const precoTotalItem = itemEscolhido.preco * quantidade; // Calcula o preço total do item adicionado
                            
                            // Adiciona o item ao pedido
                            currentState.pedidoAtual.itens.push({
                                produto: itemEscolhido.nome,
                                quantidade,
                                preco: itemEscolhido.preco
                            });
                
                            // Recalcula o valor total do pedido, somando o preço do novo item
                            const novoValorTotal = currentState.pedidoAtual.itens.reduce((total, item) => total + item.preco * item.quantidade, 0);
                            currentState.pedidoAtual.valorTotal = novoValorTotal; // Atualiza o valor total no estado atual do pedido
                
                            // Atualiza o pedido no banco de dados com os itens e o novo valor total
                            await Pedido.findByIdAndUpdate(currentState.pedidoAtual._id, {
                                itens: currentState.pedidoAtual.itens,
                                totalDoPedido: novoValorTotal // Salva o novo valor total
                            });
                
                            // Mensagem de sucesso para o cliente
                            client.sendMessage(from, `${quantidade}x ${itemEscolhido.nome} foi adicionado ao seu pedido. O valor total agora é R$ ${novoValorTotal.toFixed(2)}.\nO que deseja fazer a seguir?\n1️⃣ - Adicionar mais itens\n2️⃣ - Finalizar Pedido`);
                            currentState.step = 'adicionar_ou_finalizar'; // Novo estado para adicionar ou finalizar
                        } else {
                            client.sendMessage(from, 'Item inválido. Por favor, escolha um número válido.');
                        }
                    } catch (error) {
                        console.error('Erro ao adicionar item ao pedido:', error);
                        client.sendMessage(from, 'Ocorreu um erro ao adicionar o item ao seu pedido. Tente novamente.');
                    }
                    break;
                
            
            case 'adicionar_ou_finalizar':
                if (message.body === '1') { // Adicionar mais itens
                    client.sendMessage(from, mensagemProdutos); // Mostra a lista de produtos novamente
                    currentState.step = 'adicionar_item_pedido';
                } else if (message.body === '2') { // Finalizar Pedido
                    client.sendMessage(from, 'Seu pedido foi atualizado e finalizado.');
                    currentState.step = 0; // Volta ao menu principal
                } else {
                    client.sendMessage(from, 'Opção inválida. Escolha 1 para adicionar mais itens ou 2 para finalizar o pedido.');
                }
                break;
            case 'remover_ou_finalizar':
                if (message.body === '1') { // Remover mais itens
                    let itensResumo = currentState.pedidoAtual.itens.map((item, index) => `*${index + 1}* - ${item.quantidade}x ${item.produto}`).join('\n');
                    client.sendMessage(from, `Escolha o número do item que deseja remover:\n${itensResumo}`);
                    currentState.step = 'remover_item';
                } else if (message.body === '2') { // Finalizar Pedido
                    client.sendMessage(from, 'Seu pedido foi atualizado e finalizado.\n\n Tempo para entrega: 40 minutos 🕥');
                    currentState.step = 0; // Volta ao menu principal
                } else {
                    client.sendMessage(from, 'Opção inválida. Escolha 1 para remover mais itens ou 2 para finalizar o pedido.');
                }
                break;



            }

});
////////////////////////////////////////////////////////////////////////////////////////
// Função para formatar o número do cliente no padrão brasileiro
function formatarNumeroBR(numeroComSufixo) {
    // Remove o sufixo "@c.us"
    const numeroSemSufixo = numeroComSufixo.replace('@c.us', '');
    
    // Verifica se o número tem o código do Brasil (55) e remove-o se estiver presente
    if (numeroSemSufixo.startsWith('55')) {
        const numeroBrasil = numeroSemSufixo.substring(2); // Remove os dois primeiros dígitos (55)
        
        // Formata no estilo brasileiro (DDD + número)
        const ddd = numeroBrasil.substring(0, 2); // Extrai o DDD (primeiros 2 dígitos)
        const numero = numeroBrasil.substring(2); // Extrai o número (restante dos dígitos)
        
        return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`; // Exemplo: (79) 98875-1015
    }

    // Se o número não começar com 55, retorna o número sem sufixo
    return numeroSemSufixo;
}

// Função para monitorar mudanças no status dos pedidos
const monitorarStatusPedidos = async () => {
    try {
        // Inicia o Change Stream para monitorar o model Pedido
        const changeStream = Pedido.watch();

        // Escuta eventos de mudança
        changeStream.on('change', async (change) => {
            if (change.operationType === 'update') {
                // Obtém o _id do pedido e os campos modificados
                const pedidoId = change.documentKey._id;
                const updatedFields = change.updateDescription.updatedFields;

                // Verifica se o status foi alterado para "Pronto"
                if (updatedFields.status && updatedFields.status === 'Pronto') {
                    // Busca o pedido atualizado no banco
                    const pedidoAtualizado = await Pedido.findById(pedidoId);

                    if (pedidoAtualizado) {
                        let numeroCliente = pedidoAtualizado.cliente; // Número do cliente WhatsApp
                        
                        // Formata o número para o padrão correto, removendo "@c.us"
                        numeroCliente = formatarNumeroBR(numeroCliente);
                        
                        const mensagem = `Olá! Seu pedido está saindo para entrega! 🛵💨`;

                        // Envia mensagem para o cliente
                        client.sendMessage(`${pedidoAtualizado.cliente}`, mensagem) // Mantém o sufixo @c.us no envio
                            .then(() => console.log(`Mensagem enviada para o cliente ${numeroCliente}`))
                            .catch((err) => console.error('Erro ao enviar mensagem:', err));
                    }
                }
            }
        });

        console.log('Monitorando mudanças no status dos pedidos...');
    } catch (error) {
        console.error('Erro ao monitorar mudanças no status dos pedidos:', error);
    }
};

// Inicia a função de monitoramento
monitorarStatusPedidos();




// Inicia o cliente do WhatsApp
export default { client, initialize: () => client.initialize() };
import express from 'express';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';
import qrCodeNoTerminal from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import Pedido from '../models/Pedido.js';
import Produto from '../models/Produto.js';
import Cliente from '../models/Cliente.js'; // Importa o modelo Cliente
import { fileURLToPath } from 'url';

// Resolve corretamente o __dirname no ES6 (já que __dirname não está disponível diretamente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const qrFilePath = path.join(__dirname, 'public', 'qrcode.png'); // Caminho para salvar a imagem


const { Client, LocalAuth } = pkg;


const app = express();
app.use(express.static('public'));

// Estado dos pedidos dos usuários
let orderState = {};
let inactivityTimers = {};

// Inicializa o cliente do WhatsApp com autenticação local
const client = new Client({
    authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true, // Executar em modo headless (sem interface gráfica)
        
    }
});
const deslogar = async () => {
    try {
        // Verifica se o cliente está ativo antes de tentar deslogar
        if (client && client.info && client.info.wid) {
            await client.logout();  // Tenta deslogar o cliente

            // Como fallback, destrói a sessão e o cliente
            await client.destroy();
            console.log('WhatsApp desconectado e sessão destruída');
        } else {
            console.log('Cliente já desconectado ou sessão não encontrada.');
        }

        const qrFilePath = path.join(__dirname, '../script_chat_bot/public', 'connected.jpg');
        console.log(qrFilePath)
        fs.unlink(qrFilePath, (err) => {
            if (err) {
                console.error('Erro ao apagar imagem de mensagem de conectado', err);
                return;
            }
            console.log('Imagem de mensagem de conexão apagada com sucesso');
        });
    } catch (error) {
        console.error('Erro ao deslogar:', error.message);
    }
};



client.on('qr', async (qr) => {
    qrcode.toFile(qrFilePath, qr, (err) => {
        
        if (err) {
            console.error('Erro ao gerar QR code como imagem:', err);
            return;
        }
        console.log('QR code gerado como imagem e salvo em public/qrcode.png');
    });

    qrCodeNoTerminal.generate(qr, { small: true }); // Exibe o QR code no terminal

   
});

client.on('ready', () => {
    console.log('Bot está pronto para uso!');

    //agora ao logar apaga a imagem de qrcode e manda a imagem de logado para a front end
    const qrFilePath = path.join(__dirname, '../script_chat_bot/public', 'qrcode.png');
    console.log(qrFilePath)
    fs.unlink(qrFilePath, (err) => {
        if (err) {
            console.error('Erro ao apagar imagem de qrcode:', err);
            return;
        }
        console.log('Imagem de qrcode apagada com sucesso');
    });

    //caminho da imagem de conectado
    const imageConectada = path.join(__dirname, '../script_chat_bot/image', 'connected.jpg');
    //caminho de destino para onde será copiado
    const destinoImageConectada = path.join(__dirname, '../script_chat_bot/public', 'connected.jpg');

    //função para copiar a imagem de uma pasta para a outra
    fs.copyFile(imageConectada, destinoImageConectada, (err) => {
        if(err){
            console.log('Erro ao copiar a imagem connected.jpg', err);
        }else{
            console.log('Imagem copiada para a pasta public')
        }
    });
    
});

// Inicializa o cliente do WhatsApp
//client.initialize();

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

// Função para resetar o temporizador de inatividade
const resetTimer = (from) => {
    try {
        if (inactivityTimers[from]) {
            clearTimeout(inactivityTimers[from]);
        }
        inactivityTimers[from] = setTimeout(async() => {
    
            const currentState = orderState[from];
            const pedidoAtual = await Pedido.findByIdAndDelete(currentState.pedidoId);
            console.log('Pedido' + pedidoAtual + 'cancelado por inatividade');
    
            client.sendMessage(from, 'Você ficou inativo por muito tempo. Voltando ao início do chat.');
            client.sendMessage(from, `Olá, bem-vindo a Tudo Lanches! 😊\n1️⃣ - Fazer um pedido\n2️⃣ - Seus pedidos`);
            orderState[from] = { step: 1, items:[]}; // Redefine o estado do pedido para o início
        }, 10 * 60 * 1000); // 10 minutos em milissegundos
    } catch (error) {
        client.sendMessage(from, 'Ocorreu um erro ao resetar o temporizador de inatividade.');
        console.log('Erro ao resetar temporizador de inatividade:', error);
    }
};

// Evento de mensagem recebida
client.on('message', async (message) => {
    const from = message.from;

    // Inicializa o estado do pedido se não existir
    if (!orderState[from]) {
        orderState[from] = { step: 0, items: [] };
    }

    resetTimer(from);

    const currentState = orderState[from];
    const produtosPorCategoria = await getProdutosPorCategoria(); // Busca os produtos organizados por categoria

    // Verifica se o cliente já tem um nome salvo
    let cliente = await Cliente.findOne({ numero: from });
    let saudacao = 'Olá! Bem-vindo ao nosso estabelecimento!\n*Por favor, escolha o número do que você gostaria de pedir:*\n\n';

    if (cliente && cliente.nome) {
        saudacao = `Olá *${cliente.nome}*! Bem-vindo ao nosso estabelecimento!\n*Por favor, escolha o número do que você gostaria de pedir:*\n\n`;
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

    // Envia a mensagem com as categorias e produtos
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
                        let mensagemPedidos = '*DIGITE 0️⃣ PARA VOLTAR AO MENU INICIAL!*\n_Digite o *ID* do pedido para alterar ou cancelar._\n*Seus pedidos pendentes:*\n\n';
                        pedidosPendentes.forEach((pedido, index) => {
                            
                            let itensResumo = pedido.itens.map(item => `${item.quantidade}x ${item.produto} - R$${item.preco.toFixed(2).replace('.', ',')}`).join('\n');
                           
                            mensagemPedidos += `*Pedido ID ${index + 1}:*\n${itensResumo}\n*Total: R$${pedido.totalDoPedido.toFixed(2).replace('.', ',')}*\n*Status: ${pedido.status}*\n\n`;
                            //mensagemPedidos += `Responda com:\n1️⃣ - Alterar Pedido ${index + 1}\n2️⃣ - Cancelar Pedido ${index + 1}\n\n`;
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
           // console.log(mensagemProdutos)
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
                if (!currentState.pedidoId) {

                const objDadospedido = new Pedido ({
                    cliente: from,
                    itens: itensParaSalvar,
                    totalDoPedido: total,
                    endereco: 'Endereço a ser informado',
                    status: 'Pendente',
                    data: Date.now(),
                    observacao:'Sem observação',
                    trocoPara: 0,
                    formaDepagamento: '*'
                });
                  // Salva o pedido e armazena o ID no estado
                 const pedidoCriado = await objDadospedido.save();
                  currentState.pedidoId = pedidoCriado._id; // Armazena o ID do pedido recém-criado
    }
                try {
                   // await Pedido.create(objDadospedido);//ADICIONA PEDIDO AO BANCO DE DADOS

                    client.sendMessage(from, '*Favor informar o endereço de entrega:* \n');
                    client.sendMessage(from, `${orderSummary}\n\n*Total:* R$${total.toFixed(2)}  💸`);
                    currentState.step = 6;
                } catch (error) {
                    console.error('Erro ao salvar pedido:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao salvar seu pedido. Por favor, tente novamente.');
                }
            } else if (message.body === '3') {
                let orderSummary = '*🍔 Resumo do seu pedido:*\n\n';
                orderSummary += formatItems(currentState.items);
                
                orderSummary += '\n──────────────────\n';
                orderSummary += '🔢 *Para remover um item, digite o número correspondente ao lado do item.*\n';
                
                client.sendMessage(from, orderSummary);
                currentState.step = 5;
                
            } else {
                client.sendMessage(from, 'Opção inválida. Por favor, escolha 1️⃣ para adicionar mais itens, 2️⃣ para finalizar ou 3️⃣ para alterar o pedido.');
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
                    client.sendMessage(from, 'Seu pedido está vazio. Digite 1️⃣ para voltar ao menu inicial.\n\n');
                    currentState.step = 0;
                }
            } else {
                client.sendMessage(from, 'Item inválido. Por favor, escolha um número válido.');
            }
            break;

        case 6:
            const endereco = message.body.trim();

            if (endereco && endereco.length >= 10) {
                currentState.endereco = endereco;

                try {
                            // Busca o pedido pelo ID salvo no estado
                        const pedidoExistente = await Pedido.findById(currentState.pedidoId);

                        // Atualiza o endereço no pedido
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
                    client.sendMessage(from, 'Digite 1️⃣ para seguir sem adicionar observações.\n🍔 *Deseja adicionar alguma observação ao seu pedido?*\n\n✏️*Por exemplo:* _"X-Tudo sem alface"_ ou _"Cachorro-quente sem batata frita"!_');
                    currentState.step = 'observacao';
                
                } catch (error) {
                    console.error('Erro ao salvar nome do cliente:', error);
                    client.sendMessage(from, 'Ocorreu um erro ao salvar seu nome. Por favor, tente novamente.');
                }
            } else {
                client.sendMessage(from, 'Por favor, insira um nome válido.');
            }
            break;

            case 'observacao':
               let observacaoTexto = currentState.observacao = message.body;
               if(observacaoTexto === '1'){
                   currentState.observacao = 'Sem observação';
                   console.log(currentState.observacao);
                   client.sendMessage(from, 'Qual sera a forma de pagamento? \n\n1️⃣ - Dinheiro\n2️⃣ - Cartão\n3️⃣ - Pix');
                   currentState.step = 8;
               }else{
                console.log(currentState.observacao);
                const pedidoAtual = await Pedido.findById(currentState.pedidoId);
                if(!pedidoAtual){
                    client.sendMessage(from,'Pedido não encontrado. Por favor, tente novamente.');
                    return 
                }
                pedidoAtual.observacao = observacaoTexto;
                await pedidoAtual.save();
                console.log('Observação salva com sucesso!');
                client.sendMessage(from, 'Qual sera a forma de pagamento? \n\n1️⃣ - Dinheiro\n2️⃣ - Cartão\n3️⃣ - Pix');
                currentState.step = 8;
            }
            break;

            case 8:
    let formaPagamentoTexto;
    let nomeCliente;

    try {
        // Busca o nome do cliente no banco de dados
        nomeCliente = cliente.nome;

        // Verifica a escolha de forma de pagamento
        if (message.body.trim() === '1') {
            formaPagamentoTexto = 'Dinheiro 💵';
            const totalPedido = currentState.items.reduce((acc, item) => acc + item.preco, 0).toFixed(2);

            // Solicita ao cliente que informe o valor para troco
            client.sendMessage(
                from,
                `💵 *Pagamento em Dinheiro Selecionado*\n\n` +
                `O total do seu pedido é: *R$${totalPedido}*.\n` +
                `Se precisar de troco, por favor, informe o valor com o qual irá pagar. (Ex: 50)`
            );

            console.log('Forma de pagamento escolhida:', formaPagamentoTexto);

            const pedidoAtual = await Pedido.findById(currentState.pedidoId);

            if (!pedidoAtual) {
                client.sendMessage(from, 'Pedido não encontrado. Por favor, tente novamente.');
                return;
            }

            pedidoAtual.formaDepagamento = formaPagamentoTexto;
            await pedidoAtual.save();

            // Direciona para a etapa 9 para informar o troco
            currentState.step = 9;
            return;

        } else if (message.body.trim() === '2') {
            formaPagamentoTexto = 'Cartão 💳';
            console.log('Forma de pagamento escolhida:', formaPagamentoTexto);

        } else if (message.body.trim() === '3') {
            formaPagamentoTexto = 'Pix ✨';
            console.log('Forma de pagamento escolhida:', formaPagamentoTexto);

        } else {
            client.sendMessage(
                from,
                '❌ Forma de pagamento inválida. Por favor, escolha uma forma de pagamento válida (1 - Dinheiro, 2 - Cartão, 3 - Pix).'
            );
            return;
        }

        // Caso a forma de pagamento seja Cartão ou Pix, finaliza o pedido diretamente
        if (formaPagamentoTexto !== 'Dinheiro') {
            const pedidoAtual = await Pedido.findById(currentState.pedidoId);

            if (!pedidoAtual) {
                client.sendMessage(from, 'Pedido não encontrado. Por favor, tente novamente.');
                return;
            }

            pedidoAtual.formaDepagamento = formaPagamentoTexto;
            await pedidoAtual.save();

            const totalPedido = currentState.items.reduce((acc, item) => acc + item.preco, 0).toFixed(2);
            client.sendMessage(
                from,
                `Obrigado, *${nomeCliente.toUpperCase()}*! Seu pedido foi registrado com sucesso.\n\n` +
                `*Nome:* ${nomeCliente.toUpperCase()}\n*Endereço:* ${currentState.endereco.toUpperCase()}\n` +
                `*Forma de Pagamento:* ${formaPagamentoTexto.toUpperCase()}\n` +
                `*Observação:* ${currentState.observacao.toUpperCase()}\n\n` +
                `*Total:* R$${totalPedido} 💸\n\nTempo para entrega: 40 minutos 🕥\n\nObrigado por escolher a Tudo Lanches! 😊`
            );

            delete orderState[from]; // Limpa o estado do pedido
        }

    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        client.sendMessage(from, 'Ocorreu um erro ao registrar seu pedido. Por favor, tente novamente.');
    }
    break;

case 9:
    let nomeClienteTroco;

    try {
        // Busca o nome do cliente no banco de dados
        nomeClienteTroco = cliente.nome;

        // Lida com o troco para pagamento em dinheiro
        const valorTroco = parseFloat(message.body.trim());

        // Verifica se o valor informado é válido e maior que o total do pedido
        const totalPedido = currentState.items.reduce((acc, item) => acc + item.preco, 0).toFixed(2);

        if (isNaN(valorTroco) || valorTroco <= 0) {
            client.sendMessage(
                from,
                '❌ Valor inválido. Por favor, informe um valor válido para o troco.\nExemplo: Se você vai pagar com R$50, digite "50".'
            );
            return;
        }

        if (valorTroco < totalPedido) {
            client.sendMessage(
                from,
                `❌ O valor informado (R$${valorTroco.toFixed(2)}) é menor que o total do pedido (R$${totalPedido}).\n` +
                'Por favor, informe um valor maior ou igual ao total do pedido.'
            );
            return;
        }

        const trocoPara = valorTroco //- totalPedido;

        // Atualiza o pedido com o valor do troco
        const pedidoAtual = await Pedido.findById(currentState.pedidoId);

        if (!pedidoAtual) {
            client.sendMessage(from, 'Pedido não encontrado. Por favor, tente novamente.');
            return;
        }

        pedidoAtual.trocoPara = trocoPara;
        await pedidoAtual.save();

        client.sendMessage(
            from,
            `Obrigado, *${nomeClienteTroco.toUpperCase()}*! Seu pedido foi registrado com sucesso.\n\n` +
            `*Nome:* ${nomeClienteTroco.toUpperCase()}\n*Endereço:* ${currentState.endereco.toUpperCase()}\n` +
            `*Forma de Pagamento:* Dinheiro (Troco para: R$${valorTroco.toFixed(2)})\n` +
            `*Observação:* ${currentState.observacao.toUpperCase()}\n\n` +
            `*Total:* R$${totalPedido} 💸\n\nTempo para entrega: 40 minutos 🕥\n\nObrigado por escolher a Tudo Lanches! 😊`
        );

        delete orderState[from]; // Limpa o estado do pedido

    } catch (error) {
        console.error('Erro ao calcular troco:', error);
        client.sendMessage(from, 'Ocorreu um erro ao calcular o troco. Por favor, tente novamente.');
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
                    client.sendMessage(from, 'DIGITE 0️⃣ PARA VOLTAR AO MENU INICIAL!*\nVocê não tem pedidos pendentes.');
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
            client.sendMessage(from, '*DIGITE 0️⃣ PARA VOLTAR AO MENU INICIAL!*\nO que você gostaria de alterar?\n1️⃣ - Adicionar itens\n2️⃣ - Remover itens');
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
                        
                        // Obtém o pedido atual do banco de dados usando o ID do pedido
                        const pedidoAtual = await Pedido.findById(currentState.pedidoAtual._id);
                        
                        if (!pedidoAtual) {
                            client.sendMessage(from, 'Pedido não encontrado. Tente novamente.');
                            return;
                        }
                
                        // Obtém o total do pedido existente
                        let totalDoPedidoAtual = pedidoAtual.totalDoPedido || 0;
                
                        // Obtem o índice do item escolhido e verifica se ele é válido
                        const itemEscolhidoIndex = parseInt(message.body) - 1;
                        const itemEscolhido = listaDeProdutos[itemEscolhidoIndex];
                
                        if (itemEscolhido) {
                            const quantidade = 1; // Aqui você pode implementar a lógica para escolher a quantidade de itens

                            const precoTotalItem = itemEscolhido.preco * quantidade; // Calcula o preço total do item adicionado
                            
                            // Adiciona o novo item ao array de itens do pedido
                            pedidoAtual.itens.push({
                                produto: itemEscolhido.nome,
                                quantidade,
                                preco: precoTotalItem // Armazena o preço total do novo item
                            });
                
                            // Atualiza o novo total do pedido
                            const novoTotalDoPedido = totalDoPedidoAtual + precoTotalItem;
                
                            // Atualiza o pedido no banco de dados
                            await Pedido.findByIdAndUpdate(currentState.pedidoAtual._id, {
                                itens: pedidoAtual.itens,
                                totalDoPedido: novoTotalDoPedido // Salva o novo valor total
                            });
                
                            // Mensagem de sucesso para o cliente
                            client.sendMessage(from, `${quantidade}x ${itemEscolhido.nome} foi adicionado ao seu pedido. O valor total agora é R$ ${novoTotalDoPedido.toFixed(2)}.\nO que deseja fazer a seguir?\n1️⃣ - Adicionar mais itens\n2️⃣ - Finalizar Pedido`);
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
                if (updatedFields.status && updatedFields.status === 'pronto') {
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
                if (updatedFields.status && updatedFields.status === 'em preparo') {
                    // Busca o pedido atualizado no banco
                    const pedidoAtualizado = await Pedido.findById(pedidoId);

                    if (pedidoAtualizado) {
                        let numeroCliente = pedidoAtualizado.cliente; // Número do cliente WhatsApp
                        
                        // Formata o número para o padrão correto, removendo "@c.us"
                        numeroCliente = formatarNumeroBR(numeroCliente);
                        
                        const mensagem = `Olá! Seu pedido começou a ser preparado! 🍔🍟`;

                        // Envia mensagem para o cliente
                        client.sendMessage(`${pedidoAtualizado.cliente}`, mensagem) // Mantém o sufixo @c.us no envio
                            .then(() => console.log(`Mensagem enviada para o cliente ${numeroCliente}`))
                            .catch((err) => console.error('Erro ao enviar mensagem:', err));
                    }
                }
                if(updatedFields.status && updatedFields.status === 'entregue'){
                    // Busca o pedido atualizado no banco
                    const pedidoAtualizado = await Pedido.findById(pedidoId);

                    if (pedidoAtualizado) {
                        let numeroCliente = pedidoAtualizado.cliente; // Número do cliente WhatsApp
                        
                        // Formata o número para o padrão correto, removendo "@c.us"
                        numeroCliente = formatarNumeroBR(numeroCliente);
                        
                        const mensagem = `Olá! Seu pedido foi entregue com sucesso! 🎉🎊`;

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

//DEV AlefSantos


// Inicia o cliente do WhatsApp
export default { initialize: () => client.initialize(), deslogar, client};
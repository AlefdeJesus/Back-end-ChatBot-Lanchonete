/*
import mongoose from 'mongoose';
import Produto from '../../models/Produto.js';

/////////////////////////FUNÇÃO DE TESTE APENAS PARA CADASTRAR PRODUTOS NO BANCO // Função para cadastrar produtos
const cadastrarProdutos = async () => {
    

    // Dados dos produtos com categorias
    const produtos = [
        { id: 1, nome: 'Coxinha', descricao: 'Deliciosa coxinha de frango com catupiry.', preco: 5.20, categoria: '🍔 Lanches' },
        { id: 2, nome: 'X-Burguer', descricao: 'Hambúrguer suculento com queijo, alface, tomate e molho especial.', preco: 12.00, categoria: '🍔 Lanches' },
        { id: 3, nome: 'Pastel', descricao: 'Pastel crocante com recheio de carne, queijo ou frango.', preco: 7.51, categoria: '🍔 Lanches' },
        { id: 4, nome: 'Hambúrguer', descricao: 'Hambúrguer artesanal com queijo cheddar e bacon.', preco: 15.10, categoria: '🍔 Lanches' },
        { id: 5, nome: 'Sorvete de Chocolate', descricao: 'Sorvete cremoso de chocolate belga.', preco: 6.00, categoria: '🍧 Sorvetes' },
        { id: 6, nome: 'Sorvete de Morango', descricao: 'Sorvete refrescante de morango natural.', preco: 6.00, categoria: '🍧 Sorvetes' },
        { id: 7, nome: 'Sorvete de Baunilha', descricao: 'Sorvete clássico de baunilha com favas naturais.', preco: 6.50, categoria: '🍧 Sorvetes' },
        { id: 8, nome: 'Sundae', descricao: 'Sundae com cobertura de chocolate, caramelo ou morango.', preco: 8.00, categoria: '🍧 Sorvetes' },
        { id: 9, nome: 'Coca-Cola', descricao: 'Refrigerante Coca-Cola.', preco: 4.00, categoria: '🥃 Refrigerantes' },
        { id: 10, nome: 'Guaraná', descricao: 'Refrigerante Guaraná.', preco: 4.00, categoria: '🥃 Refrigerantes' },
        { id: 11, nome: 'Fanta Laranja', descricao: 'Refrigerante Fanta Laranja.', preco: 4.00, categoria: '🥃 Refrigerantes' },
        { id: 12, nome: 'Sprite', descricao: 'Refrigerante Sprite.', preco: 4.00, categoria: '🥃 Refrigerantes' },
        { id: 13, nome: 'Suco de Laranja', descricao: 'Suco natural de laranja.', preco: 5.00, categoria: '🍹 Sucos Naturais' },
        { id: 14, nome: 'Suco de Limão', descricao: 'Suco natural de limão.', preco: 5.00, categoria: '🍹 Sucos Naturais' },
        { id: 15, nome: 'Suco de Abacaxi', descricao: 'Suco natural de abacaxi.', preco: 5.00, categoria: '🍹 Sucos Naturais' },
        { id: 16, nome: 'Água Mineral sem Gás', descricao: 'Água mineral sem gás.', preco: 2.00, categoria: '🍶 Água' },
        { id: 17, nome: 'Água Mineral com Gás', descricao: 'Água mineral com gás.', preco: 2.00, categoria: '🍶 Água' },
        { id: 18, nome: 'Milkshake de Chocolate', descricao: 'Milkshake cremoso de chocolate.', preco: 8.00, categoria: '🥤 Milkshakes' },
        { id: 19, nome: 'Milkshake de Morango', descricao: 'Milkshake cremoso de morango.', preco: 8.00, categoria: '🥤 Milkshakes' },
        { id: 20, nome: 'Milkshake de Baunilha', descricao: 'Milkshake cremoso de baunilha.', preco: 8.00, categoria: '🥤 Milkshakes' },
        { id: 21, nome: 'Pudim', descricao: 'Pudim de leite condensado com calda de caramelo.', preco: 6.00, categoria: '🥧 Sobremesas' },
        { id: 22, nome: 'Torta de Limão', descricao: 'Torta de limão com base crocante e cobertura de merengue.', preco: 7.00, categoria: '🥧 Sobremesas' },
        { id: 23, nome: 'Brownie', descricao: 'Brownie de chocolate com nozes.', preco: 6.00, categoria: '🥧 Sobremesas' },
        { id: 24, nome: 'Murse', descricao: 'Murse de leite com maracujá', preco: 12.50, categoria: '🥧 Sobremesas' }
    ];

    try {
        for (const produto of produtos) {
            const produtoExistente = await Produto.findOne({ id: produto.id });
            if (!produtoExistente) {
                await Produto.create(produto);
                console.log(`Produto cadastrado: ${produto.nome}`);
            } else {
                //console.log(`Produto já cadastrado: ${produto.nome}`);
            }
        }
    } catch (error) {
        console.error('Erro ao cadastrar produtos:', error);
    } finally {
      //  mongoose.connection.close();
    }
};
//teste
export default cadastrarProdutos;*/
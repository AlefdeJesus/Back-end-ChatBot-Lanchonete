import Produto from "../models/Produto.js";


class ProdutoController {
    // Método para criar um novo produto
    static async criarProduto(req, res) {
        const { nome, preco, categoria, descricao, quantidade } = req.body;
        const novoProduto = new Produto({ nome, preco, categoria, descricao, quantidade });

        try {
            // Tentativa de salvar o produto no banco
            await novoProduto.save();
            res.status(201).json(novoProduto);
        } catch (error) {
            console.error('Erro ao criar novo produto:', error);
            res.status(500).json({ message: 'Erro ao criar novo produto' });
        }        
    }

    // Método para listar todos os produtos
    static async listarProdutos(req, res) {
        try {
            // Busca todos os produtos no banco de dados
            const produtos = await Produto.find();
            res.status(200).json(produtos);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            res.status(500).json({ message: 'Erro ao buscar produtos' });
        }
    }

    // Método para listar um produto pelo ID
    static async listarProdutoPorId(req, res) {
        const { id } = req.params;

        try {
            // Busca o produto pelo ID
            const produto = await Produto.findById(id);
            
            if (!produto) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            res.status(200).json(produto);
        } catch (error) {
            console.error('Erro ao listar produto:', error);
            res.status(500).json({ message: 'Erro ao listar produto' });
        }
    }

    // Método para atualizar um produto pelo ID
    static async atualizarProduto(req, res) {
        const { id } = req.params;
        const { nome, preco, categoria, descricao, quantidade } = req.body;

        try {
            // Atualiza o produto pelo ID
            const produtoAtualizado = await Produto.findByIdAndUpdate(
                id, 
                { nome, preco, categoria, descricao, quantidade }, 
                { new: true }
            );

            if (!produtoAtualizado) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            res.status(200).json(produtoAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({ message: 'Erro ao atualizar produto' });
        }
    }

    // Método para deletar um produto pelo ID
    static async deletarProduto(req, res) {
        const { id } = req.params;

        try {
            // Deleta o produto pelo ID
            const produtoDeletado = await Produto.findByIdAndDelete(id);

            if (!produtoDeletado) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            res.status(200).json({ message: 'Produto deletado com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            res.status(500).json({ message: 'Erro ao deletar produto' });
        }
    }
    
}

export default ProdutoController;

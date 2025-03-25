import mongoose from 'mongoose';
import {v4 as uuidv4} from 'uuid';

const produtoSchema = new mongoose.Schema({
    id: { type: String, unique: true, default: uuidv4 },
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    preco: { type: String, required: true },
    categoria: { type: String, required: true } // Adicionando o campo categoria
});

const Produto = mongoose.model('Produto', produtoSchema);

export default Produto;
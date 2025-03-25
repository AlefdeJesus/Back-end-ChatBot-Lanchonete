import mongoose from 'mongoose';

const ClienteSchema = new mongoose.Schema({
    numero: { type: String, required: true, unique: true },
    nome: { type: String, required: false }
});

const Cliente = mongoose.model('Cliente', ClienteSchema);

export default Cliente;
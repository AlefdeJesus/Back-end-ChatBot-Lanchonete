import mongoose from 'mongoose';

async function conectarDba(){
  await  mongoose.connect(process.env.DB_CONNECTION);

    return mongoose.connection;
}

export default conectarDba;
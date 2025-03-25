const venon = require ('venom-bot');
const axios = require ('axios');

venon.create({
    session:"chatGPT_bot",
    multidevice:true,
})
.then((client)=> start(client))
.catch((err)=> console.log(err));

const header = {
     "Content-Type": "application/json",
     "Authorization": "Bearer sk-proj-ldLsLugQ30WvaUqAkjOfT3BlbkFJYVcM36IAhbmCuL2Em8nH" 
}

const start = (client)=>{
    client.onMessage((message)=>{
    // console.log("Mensagem recebida:", message);
       axios.post("https://api.openai.com/v1/chat/completions",{
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": message.body}],
            "temperature": 0.7
           
        
       },{
        
        headers: header
       })
       .then((response)=>{
        console.log('Resposta da API:',response); 
       })
       .catch((err)=>{
            console.log(err)
       })
    })
};

//sk-proj-bRBYwxj6BFppha4LIEmPT3BlbkFJerkIFrzfbuLd7vqG8Q84
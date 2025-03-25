# ChatBot Lanchonete API 🍔



[![LinkedIn](https://img.shields.io/badge/LinkedIn-Compartilhe-blue.svg)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/AlefdeJesus/Back-end-ChatBot-Lanchonete)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()
[![Licença](https://img.shields.io/badge/Licença-MIT-purple)]()

> API para gerenciamento de pedidos de lanchonete com integração WhatsApp e sistema de notificações automáticas.


## 🖥️ Front-end

O front-end desta aplicação está disponível em um repositório separado:

- [Repositório Front-end ChatBot Lanchonete](https://github.com/AlefdeJesus/Front-End-ChatBot-Lanchonete)

Para uma experiência completa, recomendamos:

1. Configure e inicie primeiro este back-end
2. Em seguida, configure o front-end seguindo as instruções do repositório acima
3. Certifique-se que a URL da API no front-end aponta para este servidor (padrão: http://localhost:3333)

## 📋 Índice

- [Recursos](#-recursos)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Arquitetura](#-arquitetura)
- [API Endpoints](#-api-endpoints)
- [Integração WhatsApp](#-integração-whatsapp)
- [Demonstração](#-demonstração)
- [Autor](#-autor)

## 🚀 Recursos

- ✅ Gestão completa de produtos e pedidos
- ✅ Integração com WhatsApp para recebimento de pedidos
- ✅ Sistema de notificações automáticas
- ✅ Dashboard para acompanhamento em tempo real
- ✅ Persistência em MongoDB
- ✅ Arquitetura MVC

## 💻 Tecnologias Utilizadas

- Node.js
- Express
- MongoDB/Mongoose
- WhatsApp Web JS
- JWT para autenticação
- Cors

## 📝 Pré-requisitos

- Node.js 14+
- MongoDB
- NPM ou Yarn
- WhatsApp ativo no celular

## ⚙️ Instalação

1. Clone o repositório

```bash
git clone https://github.com/AlefdeJesus/Back-end-ChatBot-Lanchonete
```

2. Instale as dependências

```bash
npm install
```

3. Configure as variáveis ambiente

```env
DB_CONNECTION=sua_string_conexao_mongodb
JWT_SECRET=seu_jwt_secret
```

4. Inicie o servidor

```bash
node server.js
```

## 🏗️ Arquitetura

```
src/
├── controllers/    # Controladores da aplicação
├── models/         # Modelos do Mongoose
├── routes/         # Rotas da API
├── services/       # Lógica de negócios
└── config/        # Configurações
```

## 📡 API Endpoints

### Produtos

#### GET /produto

Lista todos os produtos cadastrados.

**Resposta:**

```json
[
  {
    "_id": "string",
    "nome": "string",
    "descricao": "string",
    "preco": "number",
    "categoria": "string"
  }
]
```

#### POST /produto

Cadastra um novo produto.

**Corpo da requisição:**

```json
{
  "nome": "string",
  "descricao": "string",
  "preco": "number",
  "categoria": "string"
}
```

#### PUT /produto/:id

Atualiza um produto existente.

**Corpo da requisição:**

```json
{
  "nome": "string",
  "descricao": "string",
  "preco": "number",
  "categoria": "string"
}
```

#### DELETE /produto/:id

Remove um produto.

### Pedidos

#### GET /pedido

Lista todos os pedidos.

**Resposta:**

```json
[
  {
    "_id": "string",
    "cliente": "string",
    "contatoDoCliente": "string",
    "itens": [
      {
        "produto": "string",
        "quantidade": "number",
        "preco": "number"
      }
    ],
    "totalDoPedido": "number",
    "status": "string",
    "endereco": "string",
    "data": "date",
    "observacao": "string",
    "formaDepagamento": "string",
    "trocoPara": "number"
  }
]
```

#### PUT /pedido/:id

Atualiza o status de um pedido.

**Corpo da requisição:**

```json
{
  "status": "string" // "pendente", "em preparo", "pronto" ou "entregue"
}
```

## 🤖 Integração WhatsApp

A API utiliza a biblioteca `whatsapp-web.js` para:

1. **Conexão Automática**

   - Geração de QR Code para login
   - Reconexão automática em caso de queda

2. **Fluxo de Pedidos**

   ```mermaid
   graph LR
   A[Cliente] --> B[WhatsApp] --> C[API] --> D[MongoDB]
   C --> E[Notificações] --> B
   ```

3. **Notificações Automáticas**
   - Confirmação de pedido
   - Status de preparo
   - Aviso de entrega



## 👨‍💻 Autor

**Alef Santos**

- LinkedIn: [alef-santos-362807203](https://www.linkedin.com/in/alef-santos-362807203)
- GitHub: [@AlefdeJesus](https://github.com/AlefdeJesus)

## 📄 Licença

Este projeto está sob a licença MIT.

---

<p align="center">
  Desenvolvido por Alef Santos
</p>

# Xadrez Web

## Sobre o Projeto

**Xadrez Web** é uma aplicação full-stack que permite partidas de xadrez em tempo real, com matchmaking por salas, validação completa de movimentos, xeque/xeque-mate/empate, e histórico de jogos. Também é possível importar partidas através
da notação PGN, assim como a sua observação através de um sistema de demos que passa pelas jogadas da partida.

### Tecnologias Utilizadas

- Go (backend + lógica do jogo)
- React + TypeScript (frontend)
- WebSocket (controle em tempo real da partida e api central)
- gRPC (comunicação interna entre serviços)
- PostgreSQL (banco de dados)
- Redis (sessões)
- Docker + Docker Compose
- Nginx (proxy reverso)

## Screenshots

### Tela inicial
![Home](https://i.imgur.com/BAAEIAP.png)

### Login
![Login](https://i.imgur.com/U5QdqOC.png)

### Registro
![Registro](https://i.imgur.com/cI2LzoW.png)

### Dashboard
![Dashboard](https://i.imgur.com/RGjqb0K.png)

### Partida em andamento
![Partida](https://i.imgur.com/xCKwFQ4.png)

### Tela de Jogos Salvos
![JogosSalvos](https://i.imgur.com/5u1rcQs.png)


## Como Executar (Docker)
```bash
git clone https://github.com/projeto-web-xadrez/xadrez.git
cd xadrez
```
### Crie um arquivo .env nessa estrutura e cole na pasta raiz do projeto:
```
POSTGRES_URL=url_conexao_postgres
REDIS_ADDRESS="redis:6379"
REDIS_PASSWORD=""

EMAIL_SMTP_HOST=smtp.gmail.com ou outro de sua preferência
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USERNAME=email_smtp
EMAIL_SMTP_PASSWORD=senha_smtp
EMAIL_NAME=nome_do_email
EMAIL_TEMPLATE_DIR=/app/bin/templates

INTERNAL_FRONT_URL="http://front:3000"
PORT_LOGIN=8085
INTERNAL_LOGIN_URL="http://login:8085"
PORT_API=8080
INTERNAL_API_URL="http://api:8080"
PORT_GAMESERVER=8082
INTERNAL_GAMESERVER_URL="http://gameserver:8082"
INTERNAL_PORT_GAMESERVER_GRPC_MATCHMAKING=9191
INTERNAL_GRPC_MATCHMAKING_ADDRESS="gameserver:9191"
INTERNAL_PORT_AUTH_GRPC=8989
INTERNAL_GRPC_AUTH_ADDRESS="auth:8989"

CSRF_HASH_KEY=key
```
### Execute o docker
```
# Execute o docker
docker-compose up -d --build

# Acessar no navegador
http://localhost
```



FROM golang:1.25

WORKDIR /app

# Instala as dependencias
COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 8082
EXPOSE 9191
RUN go build -o xadrez-game-server .
CMD ["./xadrez-game-server"]

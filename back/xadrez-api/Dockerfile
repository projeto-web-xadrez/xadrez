FROM golang:1.25

WORKDIR /app

# Instala as dependencias
COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 8080
RUN go build -o xadrez-api .
CMD ["./xadrez-api"]

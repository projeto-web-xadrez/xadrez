FROM golang:1.25-alpine

RUN apk add --no-cache git gcompat bash make protoc coreutils

WORKDIR /app

# Instala as dependencias
RUN mkdir login
RUN mkdir proto
COPY ./proto/go.mod ./proto/go.sum ./proto/
COPY ./login/go.mod ./login/go.sum ./login/

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest


COPY ./xadrez-api/go.mod ./xadrez-api/go.mod
COPY ./xadrez-game-server/go.mod ./xadrez-game-server/go.mod
COPY ./Makefile ./go.work ./go.work.sum ./
COPY ./login/ ./login
COPY ./proto/ ./proto

RUN cd proto && go mod download
RUN cd login && go mod download

EXPOSE 8085

RUN make login
CMD ["/app/bin/login"]

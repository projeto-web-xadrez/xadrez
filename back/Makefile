API_DIRECTORY := "xadrez-api"
GAME_SERVER_DIRECTORY := "xadrez-game-server"
OUT_DIRECTORY := "bin"

OUT_PATH := $(shell pwd)/${OUT_DIRECTORY}
.PHONY: run-api
run-api:
	cd ${API_DIRECTORY} && go run .

.PHONY: api-tests
api-tests:
	cd ${API_DIRECTORY} && go test ./...

.PHONY: build-api
build-api:
	mkdir -p ${OUT_PATH}
	cd ${API_DIRECTORY} && go build -o ${OUT_PATH}/${API_DIRECTORY}

.PHONY: run-game-server
run-game-server:
	cd ${GAME_SERVER_DIRECTORY} && go run .

.PHONY: game-server-tests
game-server-tests:
	cd ${GAME_SERVER_DIRECTORY} && go test ./...

.PHONY: build-game-server
build-game-server:
	mkdir -p ${OUT_PATH}
	cd ${GAME_SERVER_DIRECTORY} && go build -o ${OUT_PATH}/${GAME_SERVER_DIRECTORY}

.PHONY: gen-grpc
gen-grpc:
	cd ${GAME_SERVER_DIRECTORY} && protoc --go_out=. --go-grpc_out=. -I.. ../proto/*.proto
	cd ${API_DIRECTORY} && protoc --go_out=. --go-grpc_out=. -I.. ../proto/*.proto


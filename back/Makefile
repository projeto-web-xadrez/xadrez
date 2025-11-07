PROTOBUFF_DIRECTYORY := proto
TARGET := $(firstword $(MAKECMDGOALS))
OUT_DIRECTORY := bin
OUT_PATH := $(shell pwd)/${OUT_DIRECTORY}
PROJECTS := xadrez-api xadrez-game-server login

.PHONY: all
all: $(PROJECTS)

.PHONY: proto
proto:
	@echo "Building protobuf files"
	cd $(PROTOBUFF_DIRECTYORY) && ./generate.sh

.PHONY: $(PROJECTS)
$(PROJECTS): proto
	@echo "Building $@"
	go build -o ${OUT_PATH}/$@ $@;

PROTOBUFF_DIR := proto
TARGET := $(firstword $(MAKECMDGOALS))
OUT_DIR := bin
OUT_PATH := $(shell pwd)/${OUT_DIR}
SRC_DIR := src
PROJECTS := api game-server login

.PHONY: all
all: $(PROJECTS) auth

.PHONY: proto
proto:
	@echo "Building protobuf files"
	cd $(PROTOBUFF_DIR) && ./generate.sh

.PHONY: $(PROJECTS)
$(PROJECTS): proto
	@echo "Building $@"
	@cd ${SRC_DIR} && go build -o ${OUT_PATH}/$@ $@;

.PHONY: auth
auth: proto
	@echo "Building $@"
	@cd ${SRC_DIR} && go build -o ${OUT_PATH}/$@ $@;
	cp -r ${SRC_DIR}/auth/email/templates ${OUT_PATH}

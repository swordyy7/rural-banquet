# 农村流水席信息管理系统 —— 一键启动前后端
# 说明：make 的命令在 sh 下执行，Windows 请在 git bash / WSL / MSYS2 中运行。

SHELL := /bin/sh

BACKEND_PORT  := 3001
FRONTEND_PORT := 5173

.DEFAULT_GOAL := help
.PHONY: help install dev start backend frontend build clean

help: # 显示可用命令
	@echo "可用命令："
	@echo "  make install   安装前后端依赖"
	@echo "  make dev       一键启动 后端($(BACKEND_PORT)) + 前端($(FRONTEND_PORT))，Ctrl-C 同时停止"
	@echo "  make backend   只启动后端"
	@echo "  make frontend  只启动前端"
	@echo "  make build     构建前端生产包 (client/dist)"
	@echo "  make clean     删除前后端 node_modules"

install: # 安装前后端依赖
	cd server && npm install
	cd client && npm install

dev: # 一键启动前后端（Ctrl-C 同时停止两者）
	@echo "启动中… 后端 http://localhost:$(BACKEND_PORT)  前端 http://localhost:$(FRONTEND_PORT)"
	@trap 'kill 0' INT TERM EXIT; \
	(cd server && node app.js) & \
	(cd client && npm run dev) & \
	wait

start: dev # dev 的别名

backend: # 只启动后端
	cd server && node app.js

frontend: # 只启动前端
	cd client && npm run dev

build: # 构建前端生产包
	cd client && npm run build

clean: # 删除前后端 node_modules
	rm -rf server/node_modules client/node_modules

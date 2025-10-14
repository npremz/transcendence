FROM node:22-alpine

RUN apk add --no-cache \
	wget \
	python3 \
	make \
	g++

ENV NODE_ENV=development

WORKDIR /app

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=20s \
	CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

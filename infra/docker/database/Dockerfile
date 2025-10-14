FROM transcendence-base:latest

RUN apk add --no-cache sqlite

WORKDIR /database

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

RUN mkdir -p data && chown node:node data

USER node

EXPOSE 3020

CMD ["npm", "run", "dev"]

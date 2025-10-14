FROM transcendence-base:latest

RUN apk add --no-cache sqlite

WORKDIR /database

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p data

RUN chown -R node:node /database

USER node

EXPOSE 3020

CMD ["npm", "run", "dev"]

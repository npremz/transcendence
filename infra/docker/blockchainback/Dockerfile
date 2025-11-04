FROM transcendence-base:latest

WORKDIR /blockchainback

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3070

CMD ["npm", "run", "dev"]

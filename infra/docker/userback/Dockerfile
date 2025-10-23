FROM transcendence-base:latest

WORKDIR /userback

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

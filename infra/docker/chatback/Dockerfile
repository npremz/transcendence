FROM transcendence-base:latest

WORKDIR /chatback

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM transcendence-base:latest

WORKDIR /game3dback

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3050

CMD ["npm", "run", "dev"]

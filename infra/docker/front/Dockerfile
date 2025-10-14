FROM transcendence-base:latest

WORKDIR /front

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

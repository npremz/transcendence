FROM transcendence-base:latest

WORKDIR /quickplay

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3030

CMD ["npm", "run", "dev"]

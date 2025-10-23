FROM transcendence-base:latest

WORKDIR /quickplay

COPY package*.json ./

RUN npm ci
RUN npm install tsx

COPY . .

EXPOSE 3030

CMD ["npm", "run", "dev"]

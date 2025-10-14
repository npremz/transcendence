FROM transcendence-base:latest

WORKDIR /gameback

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3010

CMD ["npm", "run", "dev"]

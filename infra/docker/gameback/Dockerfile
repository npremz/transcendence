FROM node:22

WORKDIR /gameback

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node" "server.ts"]

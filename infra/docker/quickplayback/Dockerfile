FROM node:22

WORKDIR /quickplay

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3030

CMD ["npm", "run", "dev"]

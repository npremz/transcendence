FROM node:22

WORKDIR /tournament

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3040

CMD ["npm", "run", "dev"]

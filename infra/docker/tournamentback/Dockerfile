FROM transcendence-base:latest

WORKDIR /tournament

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3040

CMD ["npm", "run", "dev"]

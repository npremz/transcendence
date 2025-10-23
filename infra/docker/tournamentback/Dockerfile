FROM transcendence-base:latest

WORKDIR /tournament

COPY package*.json ./

RUN npm ci
RUN npm install tsx

COPY . .

EXPOSE 3040

CMD ["npm", "run", "dev"]

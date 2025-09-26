FROM node:22

WORKDIR /authback

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3050

CMD ["npm", "run", "dev"]

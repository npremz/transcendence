FROM node:22

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /database

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p data

RUN chown -R node:node /database

USER node

EXPOSE 3020

CMD ["npm", "run", "dev"]

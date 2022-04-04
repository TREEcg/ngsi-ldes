FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./

## Copy the dockerfile's context's community server files
COPY . .

COPY package.json tsconfig.json ./
COPY src ./src
COPY bin ./bin
COPY config ./config
RUN yarn install
# CMD ["yarn", "run" ,"start"]
ENTRYPOINT [ "node", "bin/server.js" ]
EXPOSE 3001

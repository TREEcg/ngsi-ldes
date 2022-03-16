FROM node:14
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
COPY src ./src
COPY bin ./bin
COPY config ./config
RUN yarn install
CMD ["yarn", "run" ,"start"]
EXPOSE 3001

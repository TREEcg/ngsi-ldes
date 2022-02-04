FROM node:14
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
COPY src ./src
RUN yarn install
CMD ["yarn", "run" ,"start"]
EXPOSE 3001

FROM node:16 AS appbuild
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
RUN npm install -g typescript@4.3.5
COPY . .
RUN tsc --skipLibCheck

FROM node:16-alpine
WORKDIR /usr/src/app
COPY --from=appbuild /usr/src/app .

CMD [ "node", "./dist/app.js" ]
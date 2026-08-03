FROM node:20-alpine

WORKDIR /home/node/app

COPY package.json package-lock.json ./
RUN npm install && chown -R node:node node_modules

COPY --chown=node:node . .

COPY --chown=node:node entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node
EXPOSE 5173

ENTRYPOINT ["/entrypoint.sh"]

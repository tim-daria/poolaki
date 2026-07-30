FROM node:20-alpine

WORKDIR /home/node/app

COPY --chown=1000:1000 package*.json ./
RUN chown -R 1000:1000 /home/node/app
USER 1000:1000
RUN npm install

COPY --chown=1000:1000 . .

COPY --chown=1000:1000 entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/entrypoint.sh"]
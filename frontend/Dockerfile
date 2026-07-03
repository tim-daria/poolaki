FROM node:25.1

WORKDIR /home/node/app

COPY ./react-app/package*.json .
RUN npm install

COPY ./react-app .
COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]

#!/bin/sh

mkdir -p /home/node/app/node_modules/.vite-temp
chmod 777 /home/node/app/node_modules/.vite-temp
chown -R node:node /home/node/app

exec su node -c 'npm run dev -- --host 0.0.0.0'
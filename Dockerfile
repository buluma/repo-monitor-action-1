FROM node:12

WORKDIR /home/node/app
COPY package.json ./
COPY yarn.lock ./
COPY entrypoint.sh ./
RUN mkdir -p /home/node/app/node_modules
RUN chown -cR node:node /home/node/app
USER node
RUN yarn
COPY --chown=node:node . .
RUN NODE_ENV=production yarn build
RUN chmod +x entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]
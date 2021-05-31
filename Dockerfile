FROM	node:15.6.0-alpine

ENV		NODE_ENV production
RUN		mkdir -p /usr/share/bottomtime/temp/media/images
WORKDIR	/usr/share/bottomtime
ADD     package.json yarn.lock .babelrc service/ ./
RUN     yarn install --production

CMD		[ "yarn", "serve" ]
EXPOSE	29201

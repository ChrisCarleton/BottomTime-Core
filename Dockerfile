FROM	node:15.6.0

ENV		NODE_ENV production

RUN		mkdir -p /usr/share/bottomtime/temp/media/images
WORKDIR	/usr/share/bottomtime
ADD     package.json .
ADD     yarn.lock .
ADD     .babelrc .
ADD     service/ .

RUN		yarn install --production

CMD		[ "yarn", "serve" ]
EXPOSE	29201

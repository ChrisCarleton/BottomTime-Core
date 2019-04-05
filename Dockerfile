FROM	node:10.15.3

ENV		NODE_ENV production

RUN		mkdir -p /usr/src/bottomtime
WORKDIR	/usr/src/bottomtime
ADD		. .

RUN		npm install -g gulp-cli --loglevel=error
RUN		npm install --loglevel=error

CMD		[ "npm", "start" ]
EXPOSE	29201

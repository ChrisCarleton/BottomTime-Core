FROM	node:10.15.3

ENV		NODE_ENV production

RUN		mkdir -p /usr/share/bottomtime/temp/media/images
WORKDIR	/usr/share/bottomtime
ADD		. .

RUN		npm install -g gulp-cli --loglevel=error
RUN		npm install --loglevel=error

CMD		[ "npm", "start" ]
EXPOSE	29201
